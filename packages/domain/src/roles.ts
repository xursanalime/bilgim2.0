/**
 * Rollar (docs/bilgim2.0.md §1.2).
 * Qoida: rol maktabga (SchoolMember) tegishli, global User.rolega emas.
 */

export const PLATFORM_ADMIN_ROLE = 'PLATFORM_ADMIN' as const;

export type SchoolMemberRole =
  | 'OWNER'
  | 'TEACHER'
  | 'ASSISTANT'
  | 'MODERATOR'
  | 'STUDENT';

export type Role = SchoolMemberRole | typeof PLATFORM_ADMIN_ROLE;

/** Maktab a'zolik rollari — gamification va tenant scope qoidalarida ishlatiladi. */
export const SCHOOL_MEMBER_ROLES: readonly SchoolMemberRole[] = [
  'OWNER',
  'TEACHER',
  'ASSISTANT',
  'MODERATOR',
  'STUDENT',
];

/** Gamification faqat student uchun (§4.3.1) — boshqa rollar hech qachon player emas. */
export const GAMIFICATION_ELIGIBLE_ROLES: readonly SchoolMemberRole[] = ['STUDENT'];

export function isSchoolMemberRole(value: string): value is SchoolMemberRole {
  return (SCHOOL_MEMBER_ROLES as readonly string[]).includes(value);
}
