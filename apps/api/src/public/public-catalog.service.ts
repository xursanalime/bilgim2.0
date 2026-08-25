import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

/**
 * Public tenant surface — guest tomonidan `slug.bilgim.uz`'da ko'riladi (§2,
 * §4.1.1). Endpointlar slug'dan tenant resolver orqali schoolId oladi
 * (`/public/schools/:slug/catalog`, `/public/schools/:slug/landing`, §5.5).
 * Faqat ACTIVE school va published content — consent statusi shart.
 */
@Injectable()
export class PublicCatalogService {
  /** Public course vitrinasi — faqat PUBLIC course va ACTIVE cohortlar. */
  async catalog(slug: string) {
    const school = await prisma.school.findUnique({
      where: { slug },
      select: { id: true, status: true, name: true },
    });
    if (!school || school.status !== 'ACTIVE') throw new NotFoundException('TENANT_NOT_FOUND');

    const courses = await prisma.course.findMany({
      where: { schoolId: school.id, visibility: 'PUBLIC' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        cohorts: {
          where: { status: { in: ['ACTIVE', 'FULL'] } },
          select: {
            id: true,
            title: true,
            startsAt: true,
            capacity: true,
            offers: {
              where: { isActive: true },
              select: { billingModel: true, priceUzs: true, version: true, availability: true },
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    });

    return { school: { id: school.id, name: school.name }, courses };
  }
}