import { ForbiddenException, Injectable } from '@nestjs/common';
import { prisma } from '@bilgim/db';

/**
 * XP event closed catalog (§4.3.1). Default XP va cap — server yetkasi;
 * teacher arbitrary "10000 XP berish" qila olmaydi. Har xp_eventda
 * immutable source, policy version, actor, idempotency key. Client hech
 * qachon amount/reason/studentId authority sifatida yubormaydi.
 */
export const XP_EVENTS = {
  LESSON_FIRST_COMPLETION: { key: 'LESSON_FIRST_COMPLETION', xp: 15 },
  VIDEO_WATCH_THRESHOLD: { key: 'VIDEO_WATCH_THRESHOLD', xp: 10 },
  HOMEWORK_DEADLINE_SUBMIT: { key: 'HOMEWORK_DEADLINE_SUBMIT', xp: 20 },
  TEACHER_THRESHOLD_SCORE: { key: 'TEACHER_THRESHOLD_SCORE', xp: 10 },
  LIVE_ATTENDANCE: { key: 'LIVE_ATTENDANCE', xp: 15 },
  DAILY_QUALIFYING_ACTION: { key: 'DAILY_QUALIFYING_ACTION', xp: 5 },
  CHALLENGE_COMPLETE: { key: 'CHALLENGE_COMPLETE', xp: 50 },
  COURSE_COMPLETE: { key: 'COURSE_COMPLETE', xp: 100 },
  TEACHER_ADJUSTMENT: { key: 'TEACHER_ADJUSTMENT', xp: 0 },
} as const;

export type XpEventKey = (typeof XP_EVENTS)[keyof typeof XP_EVENTS]['key'];

export interface AwardXpInput {
  schoolId: string;
  userId: string;
  eventType: XpEventKey;
  amount?: number;
  sourceEntity?: string;
  sourceId?: string;
  actorMemberId?: string;
  idempotencyKey: string;
}

/**
 * Gamification core (§4.3.1). Faqat active STUDENT SchoolMember + active
 * enrollment profili oladi. XP faqat server eventdan — ledger idempotent.
 * Streak school-local date bo'yicha.
 */
@Injectable()
export class GamificationService {
  /** Profil yaratish/qayta yaratish — eligibility guard. */
  async ensureProfile(schoolId: string, userId: string) {
    const member = await prisma.schoolMember.findFirst({
      where: { schoolId, userId, status: 'ACTIVE', role: 'STUDENT' },
      select: { id: true },
    });
    if (!member) {
      // Teacher/staff/admin/proposal uchun profil yaratish taqiqlanadi (§4.3.1).
      throw new ForbiddenException('GAMIFICATION_INELIGIBLE');
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: { schoolId, studentUserId: userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!enrollment) throw new ForbiddenException('GAMIFICATION_NO_ACTIVE_ENROLLMENT');

    const profile = await prisma.studentGamificationProfile.upsert({
      where: {
        schoolId_studentMemberId: { schoolId, studentMemberId: member.id },
      },
      create: {
        schoolId,
        studentMemberId: member.id,
        userId,
        state: 'ACTIVE',
      },
      update: { state: 'ACTIVE' },
    });
    return profile;
  }

  /** XP award — duplicate/out-of-order event unique idempotency key orqali no-op. */
  async awardXp(input: AwardXpInput): Promise<{ awarded: boolean }> {
    await this.ensureProfile(input.schoolId, input.userId);

    const eventDef = Object.values(XP_EVENTS).find((e) => e.key === input.eventType);
    if (!eventDef) return { awarded: false };

    // Idempotent — takroriy key xp ni ikki marta yozmaydi (unique constraint).
    const existing = await prisma.xpEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (existing) return { awarded: false };

    const profile = await prisma.studentGamificationProfile.findFirst({
      where: { schoolId: input.schoolId, userId: input.userId, state: 'ACTIVE' },
      select: { id: true, lifetimeXp: true, currentLevel: true },
    });
    if (!profile) return { awarded: false };

    const amount = input.amount ?? eventDef.xp;
    const newLifetime = profile.lifetimeXp + amount;
    const newLevel = levelForXp(newLifetime);

    await prisma.$transaction([
      prisma.xpEvent.create({
        data: {
          schoolId: input.schoolId,
          profileId: profile.id,
          eventType: input.eventType,
          amount,
          policyVersion: 1,
          sourceEntity: input.sourceEntity,
          sourceId: input.sourceId,
          actorMemberId: input.actorMemberId ?? null,
          idempotencyKey: input.idempotencyKey,
        },
      }),
      prisma.studentGamificationProfile.update({
        where: { id: profile.id },
        data: { lifetimeXp: newLifetime, currentLevel: newLevel },
      }),
    ]);

    return { awarded: true };
  }

  /** Daily qualifying action → streak day + DAILY_QUALIFYING_ACTION XP. */
  async recordDailyAction(schoolId: string, userId: string, localDay: Date) {
    const profile = await this.ensureProfile(schoolId, userId);
    const dayStart = new Date(localDay);
    dayStart.setHours(0, 0, 0, 0);

    const existing = await prisma.streakDay.findUnique({
      where: {
        profileId_localDate: { profileId: profile.id, localDate: dayStart },
      },
      select: { id: true },
    });
    if (existing) {
      return this.awardXp({
        schoolId,
        userId,
        eventType: 'DAILY_QUALIFYING_ACTION',
        idempotencyKey: `daily:${schoolId}:${userId}:${dayStart.toISOString()}`,
      });
    }

    // Streak hisobi: kecha day bo'lgan bo'lsa +1, aks holda 1.
    const yesterday = new Date(dayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const prevStreak = await prisma.streakDay.findUnique({
      where: { profileId_localDate: { profileId: profile.id, localDate: yesterday } },
      select: { id: true },
    });
    const newStreak = prevStreak ? profile.currentStreak + 1 : 1;

    await prisma.$transaction([
      prisma.streakDay.create({
        data: { profileId: profile.id, localDate: dayStart, policyVersion: 1 },
      }),
      prisma.studentGamificationProfile.update({
        where: { id: profile.id },
        data: {
          currentStreak: newStreak,
          bestStreak: Math.max(profile.bestStreak, newStreak),
          lastQualifyingDate: dayStart,
        },
      }),
    ]);

    return this.awardXp({
      schoolId,
      userId,
      eventType: 'DAILY_QUALIFYING_ACTION',
      idempotencyKey: `daily:${schoolId}:${userId}:${dayStart.toISOString()}`,
    });
  }

  /** GET /v1/gamification/me — faqat o'zi (summary). */
  async me(schoolId: string, userId: string) {
    await this.ensureProfile(schoolId, userId);
    const profile = await prisma.studentGamificationProfile.findFirst({
      where: { schoolId, userId },
      select: {
        id: true,
        lifetimeXp: true,
        currentLevel: true,
        currentStreak: true,
        bestStreak: true,
        updatedAt: true,
      },
    });
    const badges = profile
      ? await prisma.studentBadge.findMany({
          where: { profileId: profile.id, revokedAt: null },
          select: { badge: { select: { key: true, name: true, iconKey: true } } },
        })
      : [];
    return {
      profile,
      badges: badges.map((b) => b.badge),
      nextLevelXp: nextLevelThreshold(profile?.lifetimeXp ?? 0),
    };
  }
}

/** Level threshold jadval — 100, 250, 450, 700... (§4.3.1 versionlangan). */
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500];

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && xp >= threshold) level = i + 1;
  }
  return level;
}

export function nextLevelThreshold(xp: number): number {
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && xp < threshold) return threshold;
  }
  return -1; // max level
}