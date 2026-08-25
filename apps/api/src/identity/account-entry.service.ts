import { Injectable } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import type { MySchoolCard, SchoolMemberRole } from '@bilgim/domain';

/**
 * Login/verify tugagach server-side redirect qarorini ($2.2 AppEntryResolver).
 * Active membership soniga qarab:
 *   0  → teacher `/open-school`, boshqa user "maktabga qo'shilmagan" sahifasi;
 *   1  → `https://{slug}.bilgim.uz` (student `/learn`, staff `/manage`) 302;
 *   2+ → `https://bilgim.uz/my-schools` 302.
 */
export type EntryDecision =
  | { kind: 'NO_MEMBERSHIP'; suggestedPath: '/open-school' | '/no-school' }
  | { kind: 'REDIRECT_TENANT'; url: string }
  | { kind: 'REDIRECT_MY_SCHOOLS'; url: string };

export const ROOT_HOST = 'bilgim.uz';

@Injectable()
export class AppEntryResolver {
  async resolve(userId: string): Promise<EntryDecision> {
    const memberships = await prisma.schoolMember.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        role: true,
        schoolId: true,
        school: { select: { slug: true, ownerUserId: true } },
      },
    });

    if (memberships.length === 0) {
      return { kind: 'NO_MEMBERSHIP', suggestedPath: '/open-school' };
    }
    const first = memberships[0];
    if (memberships.length === 1 && first) {
      const role = first.role as SchoolMemberRole;
      const defaultPath = role === 'STUDENT' ? '/learn' : '/manage';
      return { kind: 'REDIRECT_TENANT', url: `${tenantHost(first.school.slug)}${defaultPath}` };
    }
    return { kind: 'REDIRECT_MY_SCHOOLS', url: `https://${ROOT_HOST}/my-schools` };
  }
}

/**
 * `GET /v1/account/my-schools` read model (§2.2).
 * Faqat authenticated `userId` bo'yicha ACTIVE SchoolMember qatorlarini
 * o'qiydi; query/body'dagi `schoolId` qabul qilinmaydi. Response faqat
 * minimal signed summary — tenant dars/baho/to'lov/xabar matni yuborilmaydi.
 * destinationUrl server host builder orqali slug'dan yasaladi.
 */
@Injectable()
export class AccountEntryService {
  async mySchools(userId: string): Promise<MySchoolCard[]> {
    const memberships = await prisma.schoolMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        school: {
          select: { id: true, slug: true, name: true, brandJson: true },
        },
      },
    });

    const summaries = await prisma.memberSchoolSummary.findMany({
      where: { userId },
      select: { schoolId: true, nextLessonAt: true, unreadMessageCount: true },
    });
    const summaryBySchool = new Map(summaries.map((s) => [s.schoolId, s]));

    return memberships.map((m) => {
      const summary = summaryBySchool.get(m.school.id);
      const logoUrl = extractLogoUrl(m.school.brandJson);
      const role = m.role as SchoolMemberRole;
      return {
        schoolId: m.school.id,
        slug: m.school.slug,
        schoolName: m.school.name,
        logoUrl,
        membershipRole: role,
        nextLessonAt: summary?.nextLessonAt?.toISOString() ?? null,
        unreadMessageCount: summary?.unreadMessageCount ?? 0,
        /** destinationUrl — server host builder, klient URL qabul qilmaydi (§2.2) */
        destinationUrl: buildDestinationUrl(m.school.slug, role),
      };
    });
  }
}

export function buildDestinationUrl(slug: string, role: SchoolMemberRole): string {
  const base = tenantHost(slug);
  const path = role === 'STUDENT' ? '/learn' : '/manage';
  return `${base}${path}`;
}

/** Server host builder — client URL qabul qilmaydi (§2.2). */
export function tenantHost(slug: string): string {
  return `https://${slug}.bilgim.uz`;
}

function extractLogoUrl(brandJson: unknown): string | null {
  if (!brandJson || typeof brandJson !== 'object') return null;
  return (brandJson as { logoUrl?: string }).logoUrl ?? null;
}