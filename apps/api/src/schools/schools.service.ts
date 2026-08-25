import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { schoolSlugIssues, normalizeSlug } from '@bilgim/domain';
import type { TenantResolveResult } from '../tenant/tenant-resolver.service';

export interface CreateSchoolInput {
  ownerUserId: string;
  slug: string;
  name: string;
  timezone?: string;
}

export interface ProvisioningResult {
  schoolId: string;
  slug: string;
  setupUrl: string;
}

/**
 * School provisioning wizard (docs §4.1, §10). Owner userni ACTIVE SchoolMember
 * va DRAFT School qilib yaratadi (owner role). Slug validatsiya §2.1;
 * reserved sluglar rad etiladi. Faza 3'gacha Free subscription row ishlatilmaydi
 * (keyingi qadamlarda qo'shiladi).
 */
@Injectable()
export class SchoolsService {
  async createSchool(input: CreateSchoolInput): Promise<ProvisioningResult> {
    const slug = normalizeSlug(input.slug);
    const issues = schoolSlugIssues(slug);
    if (issues.length > 0) {
      throw new ConflictException(`INVALID_SLUG: ${issues.join(', ')}`);
    }

    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('SLUG_TAKEN');

    // Owner active school quota (Free=1, §4.4) — Faza 3'da entitlement bilan
    // almashtiriladi. Hozircha bir user bitta ACTIVE/DRAFT school da bo'lsin.
    const activeOwnerSchools = await prisma.school.count({
      where: { ownerUserId: input.ownerUserId, status: { in: ['ACTIVE', 'DRAFT'] } },
    });
    if (activeOwnerSchools >= 1) throw new ConflictException('OWNER_SCHOOL_QUOTA');

    const school = await prisma.$transaction(async (tx) => {
      const created = await tx.school.create({
        data: {
          slug,
          name: input.name,
          ownerUserId: input.ownerUserId,
          status: 'ACTIVE',
          timezone: input.timezone ?? 'Asia/Tashkent',
        },
        select: { id: true, slug: true },
      });
      await tx.schoolMember.create({
        data: {
          schoolId: created.id,
          userId: input.ownerUserId,
          role: 'OWNER',
          status: 'ACTIVE',
          invitedBy: input.ownerUserId,
          joinedAt: new Date(),
        },
      });
      await tx.memberSchoolSummary.create({
        data: {
          userId: input.ownerUserId,
          schoolId: created.id,
        },
      });
      await tx.schoolLandingPage.create({
        data: {
          schoolId: created.id,
          template: 'CLASSIC',
          heroJson: { name: input.name, headline: '' },
        },
      });
      return created;
    });

    return {
      schoolId: school.id,
      slug: school.slug,
      setupUrl: `https://${school.slug}.bilgim.uz/setup`,
    };
  }

  /** Landing/brend tahriri — owner/assistant (Faza 2'da to'liq). Hozircha brandJson. */
  async updateBrand(
    schoolId: string,
    input: { name?: string; logoUrl?: string; headline?: string },
  ): Promise<{ ok: true }> {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('SCHOOL_NOT_FOUND');

    const brandJson = { ...((school.brandJson as Record<string, unknown>) ?? {}), ...input };
    await prisma.school.update({
      where: { id: schoolId },
      data: { name: input.name ?? school.name, brandJson: brandJson as object },
    });
    return { ok: true };
  }

  /** Tenant context orqali own school (signed). Faqat o'z maktabi — schoolId
   * request'dan emas, context'da keladi. */
  async findByTenant(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        timezone: true,
        brandJson: true,
        createdAt: true,
      },
    });
    if (!school) throw new NotFoundException('SCHOOL_NOT_FOUND');
    return school;
  }
}

export type SchoolSerialize = TenantResolveResult;