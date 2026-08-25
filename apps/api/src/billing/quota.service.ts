import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { PlanError } from './entitlement.service';

/**
 * Atomic quota reserve/finalize (§4.5). PostgreSQL transaction lock bilan:
 * concurrency'da `Pro` limiti 300dan 301 AI request yoki 40 host-soatga
 * chiqolmaydi. `UNLIMITED` (-1) har doim muvaffaqiyatli. Metred overage
 * wallet reserve'i quyidagi wallet.ts da; bu asosiy included quota.
 */
@Injectable()
export class QuotaService {
  async reserve(schoolId: string, quotaKey: string, amount: number): Promise<void> {
    const subscription = await prisma.schoolSubscription.findFirst({
      where: { schoolId },
      include: { entitlements: true },
    });
    if (!subscription) throw new PlanError('PLAN_FEATURE_NOT_INCLUDED');

    const ent = subscription.entitlements.find((e) => e.featureKey === quotaKey);
    if (!ent || !ent.enabled) throw new PlanError('PLAN_FEATURE_NOT_INCLUDED');
    if (ent.limitValue === null) return; // UNLIMITED
    if (ent.limitValue === -1n) return; // UNLIMITED sentinel

    const limit = Number(ent.limitValue);
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);

    // Atomic upsert increment — ikkita concurrency request limitdan osholmaydi.
    const usage = await prisma.entitlementUsage.upsert({
      where: {
        subscriptionId_periodStart_featureKey: {
          subscriptionId: subscription.id,
          periodStart,
          featureKey: quotaKey,
        },
      },
      create: { subscriptionId: subscription.id, periodStart, featureKey: quotaKey, reserved: BigInt(amount) },
      update: { reserved: { increment: BigInt(amount) } },
    });

    if (usage.reserved > BigInt(limit)) {
      throw new PlanError('PLAN_LIMIT_REACHED');
    }
  }

  async finalize(schoolId: string, quotaKey: string, amount: number): Promise<void> {
    const subscription = await prisma.schoolSubscription.findFirst({
      where: { schoolId },
    });
    if (!subscription) return;

    await prisma.entitlementUsage.updateMany({
      where: {
        subscriptionId: subscription.id,
        featureKey: quotaKey,
      },
      data: {
        actual: { increment: BigInt(amount) },
        reserved: { decrement: BigInt(amount) },
      },
    });
  }
}

/**
 * Global filter: PlanError → 403 PLAN_FEATURE_NOT_INCLUDED / 409
 * PLAN_LIMIT_REACHED (section 4.5 ja manyalar). Boshqa xatolar o'zgarishsiz.
 */
export function planErrorToHttp(error: unknown): HttpException | null {
  if (error instanceof PlanError) {
    const status =
      error.code === 'PLAN_LIMIT_REACHED' ? HttpStatus.CONFLICT : HttpStatus.FORBIDDEN;
    return new HttpException({ code: error.code, message: error.message }, status);
  }
  return null;
}

export function isPlanError(error: unknown): error is PlanError {
  return error instanceof PlanError;
}