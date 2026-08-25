import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { type PaymeAdapter, isPaymeMethod } from './payme.adapter';

/**
 * Payment provider webhook (server-to-server, §5.5, §6.5 email). UI emas.
 * Payme JSON-RPC; duplicate/out-of-order webhooklar idempotent ishlaydi
 * (provider tx id bo'yicha dedupe).
 */
@Controller('payments/webhooks')
export class PaymentsWebhookController {
  constructor(private readonly paymeAdapter: PaymeAdapter) {}

  @Post('payme')
  @HttpCode(HttpStatus.OK)
  async payme(@Body() body: unknown) {
    if (!isPaymeMethod(body)) return { error: -32300 };
    return this.paymeAdapter.handleWebhook(body);
  }
}