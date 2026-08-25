import { BadRequestException, Injectable } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { type OrderService } from './order.service';

interface PaymeAccount {
  order_id?: string;
  orderId?: string;
}

interface PaymeParams {
  id?: string | number;
  amount?: number;
  account?: PaymeAccount;
}

/**
 * Payme JSON-RPC merchant adapter (docs §6.5, Faza 3 P0).
 * Provider state machine: CheckPerformTransaction → (Perform) →
 * CancelTransaction. Webhook dedupe provider tx id; order exactly-once
 * fulfill (duplicate/out-of-order webhooks ham idempotent, §4.3).
 * Rasmiy: https://developer.help.paycom.uz/nastroyka-vzaimodeystviya/
 */
@Injectable()
export class PaymeAdapter {
  constructor(private readonly orders: OrderService) {}

  async handleWebhook(
    payload: Record<string, unknown>,
  ): Promise<{ result?: object; error?: number }> {
    const method = payload.method as string;
    const params = (payload.params ?? {}) as PaymeParams;
    const account = params.account ?? {};
    const orderId = (account.order_id ?? account.orderId ?? '') as string;
    const amount = Number(params.amount ?? 0);
    const txId = String(params.id ?? '');

    switch (method) {
      case 'CheckPerformTransaction': {
        const order = (await this.orders.get(orderId)) as { totalUzs?: number; payments?: Array<{ state: string }> };
        const totalTiyin = (order.totalUzs ?? 0) * 100;
        if (amount !== totalTiyin) return { error: -31050 };
        return { result: { allow: true } };
      }
      case 'PerformTransaction': {
        if (!orderId || !txId) throw new BadRequestException('PAYME_MISSING_FIELDS');
        const payment = await prisma.payment.findUnique({
          where: { provider_providerTxId: { provider: 'PAYME', providerTxId: txId } },
          select: { state: true },
        });
        if (payment?.state === 'CONFIRMED') {
          // Duplicate perform — xuddi shunday natija qaytarish (idempotent).
          return { result: { transaction: { id: txId, state: 2, perform_time: Date.now() } } };
        }
        await prisma.payment.upsert({
          where: { provider_providerTxId: { provider: 'PAYME', providerTxId: txId } },
          update: { state: 'CONFIRMED' },
          create: {
            orderId,
            provider: 'PAYME',
            providerTxId: txId,
            state: 'CONFIRMED',
            amountUzs: Math.round(amount / 100),
          },
        });
        await this.orders.fulfillEnrollmentOrder(orderId);
        return { result: { transaction: { id: txId, state: 2, perform_time: Date.now() } } };
      }
      case 'CancelTransaction': {
        if (!orderId || !txId) throw new BadRequestException('PAYME_MISSING_FIELDS');
        await prisma.payment.updateMany({
          where: { provider: 'PAYME', providerTxId: txId },
          data: { state: 'REFUNDED' },
        });
        await this.orders.cancelOrder(orderId);
        return { result: { transaction: { id: txId, state: -1, cancel_time: Date.now() } } };
      }
      case 'CheckTransaction': {
        const payment = await prisma.payment.findUnique({
          where: { provider_providerTxId: { provider: 'PAYME', providerTxId: txId } },
          select: { state: true },
        });
        const state = payment?.state === 'CONFIRMED' ? 2 : payment?.state === 'REFUNDED' ? -1 : 1;
        return {
          result: { transaction: { id: txId, state, perform_time: payment?.state ? Date.now() : 0 } },
        };
      }
      default:
        return { error: -32300 };
    }
  }
}

export function isPaymeMethod(payload: unknown): payload is Record<string, unknown> {
  return !!payload && typeof payload === 'object' && 'method' in payload;
}