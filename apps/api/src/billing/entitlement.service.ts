import { prisma } from '@bilgim/db';

/**
 * Feature key closed catalog (docs §4.5). Yangi arbitrary key yaratilmaydi —
 * plan admini ham frontend-only feature qo'sholmaydi.
 */
export const FEATURE_KEYS = {
  live_classroom: 'live.classroom',
  live_recording: 'live.recording',
  ai_grading: 'ai.grading',
  certificate_issue: 'certificate.issue',
  analytics_export: 'analytics.export',
  integration_api_keys: 'integration.api_keys',
  gamification_core: 'gamification.core',
  gamification_challenges: 'gamification.challenges',
  gamification_cohort_leaderboard: 'gamification.cohort_leaderboard',
  gamification_rewards: 'gamification.rewards',
  drip_compliance: 'drip.compliance',
  certificates: 'certificates',
  coupons: 'coupons',
  referral: 'referral',
  community: 'community',
  notifications: 'notifications',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export const QUOTA_KEYS = {
  active_students: 'quota.active_students',
  active_staff: 'quota.active_staff',
  published_courses: 'quota.published_courses',
  active_cohorts: 'quota.active_cohorts',
  media_storage: 'quota.media_storage',
  live_host_hours: 'quota.live_host_hours',
  live_participant_minutes: 'quota.live_participant_minutes',
} as const;

export type QuotaKey = (typeof QUOTA_KEYS)[keyof typeof QUOTA_KEYS];

/**
 * Entitlement/feature tekshiruvi (§4.5 zanjiri, qadam 4-5).
 * Har protected action o'zi `schoolId` + subscription snapshotidagi
 * `enabled=true` satrni topishi shart; `PLAN_FEATURE_NOT_INCLUDED` yoki
 * quota limiti tekshiriladi. Frontend hidden-state bu guardni chetlab
 * o'tolmaydi.
 */
export class EntitlementService {
  /** Exact feature enabled ekanligi — snapshot orqali (Cache: §4.5 key). */
  async requireFeature(schoolId: string, featureKey: string): Promise<void> {
    const row = await prisma.schoolSubscriptionEntitlement.findFirst({
      where: {
        subscription: { schoolId },
        featureKey,
        enabled: true,
      },
    });
    if (!row) {
      throw new PlanError('PLAN_FEATURE_NOT_INCLUDED');
    }
  }

  /** Feature quotali bo'lsa limitni qaytaradi; enabled bo'lmasa throw. */
  async getLimit(
    schoolId: string,
    quotaKey: string,
  ): Promise<{ limit: bigint | null; enabled: boolean }> {
    const row = await prisma.schoolSubscriptionEntitlement.findFirst({
      where: { subscription: { schoolId }, featureKey: quotaKey },
      select: { enabled: true, limitValue: true },
    });
    if (!row) return { limit: null, enabled: false };
    if (row.enabled && row.limitValue !== null && row.limitValue === -1n) {
      return { limit: null, enabled: true }; // UNLIMITED sentinel
    }
    return { limit: row.limitValue, enabled: row.enabled };
  }
}

/** Domain error — controller exception converter bu code'ni 403/409 qiladi. */
export class PlanError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'PlanError';
  }
}