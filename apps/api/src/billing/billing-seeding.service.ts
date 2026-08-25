import { Injectable } from '@nestjs/common';
import { prisma, type PlanCode } from '@bilgim/db';
import { FEATURE_KEYS, QUOTA_KEYS } from './entitlement.service';

/** §4.4 seeded default katalog — Free/Pro/Max (Custom explicit, Faza 3 'da CLI). */
const PLAN_DEFS: Record<
  PlanCode,
  { displayName: string; monthlyPriceUzs: number | null; annualPriceUzs: number | null; features: Record<string, { enabled: boolean; limitValue: bigint | null }> }
> = {
  FREE: {
    displayName: 'Free',
    monthlyPriceUzs: 0,
    annualPriceUzs: 0,
    features: {
      [QUOTA_KEYS.active_students]: { enabled: true, limitValue: 30n },
      [QUOTA_KEYS.active_staff]: { enabled: true, limitValue: 1n },
      [QUOTA_KEYS.published_courses]: { enabled: true, limitValue: 2n },
      [QUOTA_KEYS.active_cohorts]: { enabled: true, limitValue: 3n },
      [QUOTA_KEYS.media_storage]: { enabled: true, limitValue: 5n * 1024n * 1024n * 1024n },
      [QUOTA_KEYS.live_host_hours]: { enabled: true, limitValue: 4n },
      [QUOTA_KEYS.live_participant_minutes]: { enabled: true, limitValue: 1000n },
      [FEATURE_KEYS.gamification_core]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.notifications]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.live_classroom]: { enabled: true, limitValue: null },
      // Free: live.recording, ai.grading, certificate, challenges, etc. yo'q
    },
  },
  PRO: {
    displayName: 'Pro',
    monthlyPriceUzs: 699_000,
    annualPriceUzs: 6_990_000,
    features: {
      [QUOTA_KEYS.active_students]: { enabled: true, limitValue: 300n },
      [QUOTA_KEYS.active_staff]: { enabled: true, limitValue: 5n },
      [QUOTA_KEYS.published_courses]: { enabled: true, limitValue: 25n },
      [QUOTA_KEYS.active_cohorts]: { enabled: true, limitValue: 50n },
      [QUOTA_KEYS.media_storage]: { enabled: true, limitValue: 100n * 1024n * 1024n * 1024n },
      [QUOTA_KEYS.live_host_hours]: { enabled: true, limitValue: 40n },
      [QUOTA_KEYS.live_participant_minutes]: { enabled: true, limitValue: 10_000n },
      [FEATURE_KEYS.live_classroom]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.live_recording]: { enabled: true, limitValue: 20n },
      [FEATURE_KEYS.ai_grading]: { enabled: true, limitValue: 300n },
      [FEATURE_KEYS.gamification_core]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_challenges]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_cohort_leaderboard]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_rewards]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.drip_compliance]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.certificates]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.coupons]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.referral]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.community]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.notifications]: { enabled: true, limitValue: null },
    },
  },
  MAX: {
    displayName: 'Max',
    monthlyPriceUzs: 5_490_000,
    annualPriceUzs: 54_900_000,
    features: {
      [QUOTA_KEYS.active_students]: { enabled: true, limitValue: 2000n },
      [QUOTA_KEYS.active_staff]: { enabled: true, limitValue: 20n },
      [QUOTA_KEYS.published_courses]: { enabled: true, limitValue: -1n },
      [QUOTA_KEYS.active_cohorts]: { enabled: true, limitValue: -1n },
      [QUOTA_KEYS.media_storage]: { enabled: true, limitValue: 1024n * 1024n * 1024n },
      [QUOTA_KEYS.live_host_hours]: { enabled: true, limitValue: 300n },
      [QUOTA_KEYS.live_participant_minutes]: { enabled: true, limitValue: 40_000n },
      [FEATURE_KEYS.live_classroom]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.live_recording]: { enabled: true, limitValue: 200n },
      [FEATURE_KEYS.ai_grading]: { enabled: true, limitValue: 2000n },
      [FEATURE_KEYS.integration_api_keys]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.certificate_issue]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.analytics_export]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_core]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_challenges]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_cohort_leaderboard]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.gamification_rewards]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.drip_compliance]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.certificates]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.coupons]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.referral]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.community]: { enabled: true, limitValue: null },
      [FEATURE_KEYS.notifications]: { enabled: true, limitValue: null },
    },
  },
};

/**
 * Plan versiyalarini seed qiladi (idempotent) va school uchun Free subscription
 * snapshot hamda wallet yaratadi. §4.4: subscription User'ga emas School'ga;
 * har plan barcha katalog key bilen — missing satr allowed emas.
 */
@Injectable()
export class BillingSeedingService {
  async seedPlatformPlans(): Promise<void> {
    for (const code of Object.keys(PLAN_DEFS) as PlanCode[]) {
      const def = PLAN_DEFS[code];
      const existing = await prisma.platformPlan.findFirst({
        where: { code, version: 1, isActive: true },
      });
      if (existing) continue;

      const plan = await prisma.platformPlan.create({
        data: {
          code,
          displayName: def.displayName,
          version: 1,
          monthlyPriceUzs: def.monthlyPriceUzs,
          annualPriceUzs: def.annualPriceUzs,
          isActive: true,
        },
      });

      // Katalog entriyalari — mavjud bo'lmagan key ham false/0 bilan yoziladi.
      await Promise.all(
        Object.entries(def.features).map(([key, f]) =>
          prisma.planEntitlement.create({
            data: { planId: plan.id, featureKey: key, enabled: f.enabled, limitValue: f.limitValue },
          }),
        ),
      );
    }
  }

  /** Maktab yaratilgach Free subscription + wallet (quota: owner active-school 1). */
  async provisionFreeSubscription(schoolId: string): Promise<void> {
    const freePlan = await prisma.platformPlan.findFirst({
      where: { code: 'FREE', isActive: true },
      include: { entitlements: true },
      orderBy: { version: 'desc' },
    });
    if (!freePlan) throw new Error('FREE plan topilmadi — avval seedPlatformPlans()');

    await prisma.$transaction(async (tx) => {
      const sub = await tx.schoolSubscription.create({
        data: {
          schoolId,
          planId: freePlan.id,
          state: 'ACTIVE',
          subscriptionVersion: 1,
          monthlyPriceUzs: freePlan.monthlyPriceUzs,
        },
        select: { id: true },
      });
      await tx.schoolSubscriptionEntitlement.createMany({
        data: freePlan.entitlements.map((e) => ({
          subscriptionId: sub.id,
          featureKey: e.featureKey,
          enabled: e.enabled,
          limitValue: e.limitValue,
        })),
      });
      await tx.usageWallet.create({ data: { schoolId } });
    });
  }
}