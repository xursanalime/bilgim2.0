import { z } from 'zod';
import type { SchoolMemberRole } from './roles';

/**
 * Tenant request context — har Nest request generic holdıre (docs §5.2).
 * Query/body'dagi `schoolId` hech qachon authority emas; bu context
 * server-side host resolver yoki signed BFF orqali beriladi.
 */
export interface TenantContext {
  schoolId: string;
  slug: string;
  requestId: string;
}

/**
 * `bilgim.uz/my-schools` minimal kartasi (§2.2).
 * Faqat account-level signed summary; tenant content (dars/baho/to'lov/xabar
 * matni) hech qachon bu payloadga kirmaydi.
 */
export interface MySchoolCard {
  schoolId: string;
  slug: string;
  schoolName: string;
  logoUrl: string | null;
  membershipRole: SchoolMemberRole;
  /** ISO time; lesson body/title/course/payment yo'q */
  nextLessonAt: string | null;
  /** Faqat son — message preview yo'q */
  unreadMessageCount: number;
  /** https://{slug}.bilgim.uz[/learn|/manage] — server host builder yasaydi */
  destinationUrl: string;
}

/**
 * Reserved subdomen lisluglar (§2.1) — platforma/infra surface'lar bilan
 * to'qnashmaslik uchun, ular hech qachon tenant slug bo'lolmaydi.
 */
export const RESERVED_SCHOOL_SLUGS: readonly string[] = [
  'www',
  'api',
  'admin',
  'media',
  'assets',
  'mail',
  'docs',
  'status',
  'support',
  'app',
  'cdn',
  'staging',
  'dev',
  'test',
];

const RESERVED_SLUGS = new Set<string>(RESERVED_SCHOOL_SLUGS);

export const SCHOOL_SLUG_MIN = 3;
export const SCHOOL_SLUG_MAX = 40;

/**
 * Slug quoidasi (§2.1): lower-case ASCII [a-z0-9-], 3–40 belgi,
 * bosh/oxirida '-' emas, reserved bo'lmasin.
 */
export const schoolSlugSchema = z
  .string()
  .min(SCHOOL_SLUG_MIN)
  .max(SCHOOL_SLUG_MAX)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message:
      'slug faqat kichik harf, raqam va defisdan iborat bo\'lib, "-" bilan boshlanmaydi va tugamaydi',
  })
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: 'bu slug platforma uchun zaxiralangan',
  });

/** Slug validatsiya xatolari ro'yxati — UI i18n fallback uchun. */
export function schoolSlugIssues(slug: string): string[] {
  const result = schoolSlugSchema.safeParse(slug);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** Value-object: slug minor normalizatsiyasi — kichik harf qiladi. */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}