import { Injectable } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import type { MySchoolCard, SchoolMemberRole } from '@bilgim/domain';

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