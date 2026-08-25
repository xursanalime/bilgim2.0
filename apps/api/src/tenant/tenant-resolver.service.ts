import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { isReservedSlug, normalizeSlug } from '@bilgim/domain';

export interface TenantResolveResult {
  schoolId: string;
  slug: string;
  name: string;
  status: string;
}

/**
 * Slug → tenant resolver (§5.2). Reserved hostlar/sluglar hech qachon tenant
 * bo'lmaydi (§2.1). Faqat ACTIVE maktab resolve qilinadi; boshqa status
 * (DRAFT/SUSPENDED/CLOSED) tenant app tomonidan 404 beriladi. Middleware
 * server-side shu resolver/turli cache-dan foydalanadi; cache key
 * `tenant:slug:<slug>`, TTL 60s (Faza 1'da Redis qo'shiladi).
 */
@Injectable()
export class TenantResolverService {
  async resolve(slugInput: string): Promise<TenantResolveResult> {
    const slug = normalizeSlug(slugInput);
    if (isReservedSlug(slug)) throw new NotFoundException('TENANT_NOT_FOUND');

    const school = await prisma.school.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, status: true },
    });
    if (!school || school.status !== 'ACTIVE') throw new NotFoundException('TENANT_NOT_FOUND');

    return {
      schoolId: school.id,
      slug: school.slug,
      name: school.name,
      status: school.status,
    };
  }

  async resolveById(schoolId: string): Promise<TenantResolveResult | null> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, slug: true, name: true, status: true },
    });
    return school ? { schoolId: school.id, slug: school.slug, name: school.name, status: school.status } : null;
  }
}