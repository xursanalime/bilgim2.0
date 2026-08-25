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

  /**
   * Public landing (§4.1.1): faqat published page, published highlights va
   * PUBLIC_CONSENT (GRANTED) proof/testimoniallar. Draft landing guest'ga 404.
   */
  async landing(slug: string) {
    const school = await prisma.school.findUnique({
      where: { slug },
      select: { id: true, status: true, name: true, brandJson: true },
    });
    if (!school || school.status !== 'ACTIVE') throw new NotFoundException('TENANT_NOT_FOUND');

    const page = await prisma.schoolLandingPage.findUnique({
      where: { schoolId: school.id },
      select: {
        template: true,
        heroJson: true,
        faqJson: true,
        contactJson: true,
        seoJson: true,
        isPublished: true,
        publishedVersion: true,
        publishedAt: true,
      },
    });
    // Draft/published bo'lmagan landing guestga 404 — eski public versiya ham yo'q (§4.1.1).
    if (!page?.isPublished) throw new NotFoundException('LANDING_NOT_PUBLISHED');

    const [highlights, successStories, testimonials] = await Promise.all([
      prisma.landingHighlight.findMany({
        where: { schoolId: school.id, isPublished: true },
        select: { label: true, value: true, iconKey: true, position: true },
        orderBy: { position: 'asc' },
      }),
      prisma.landingSuccessStory.findMany({
        where: { schoolId: school.id, isPublished: true, consentStatus: 'GRANTED' },
        select: { title: true, body: true, metricLabel: true, metricValue: true, studentAlias: true },
        orderBy: { position: 'asc' },
      }),
      prisma.landingTestimonial.findMany({
        where: { schoolId: school.id, isPublished: true, consentStatus: 'GRANTED' },
        select: { displayName: true, body: true, courseLabel: true },
        orderBy: { position: 'asc' },
      }),
    ]);

    return {
      school: { name: school.name, brandJson: school.brandJson },
      page: {
        template: page.template,
        hero: page.heroJson,
        faq: page.faqJson,
        contact: page.contactJson,
        seo: page.seoJson,
        publishedVersion: page.publishedVersion,
        publishedAt: page.publishedAt,
      },
      highlights,
      successStories,
      testimonials,
    };
  }
}