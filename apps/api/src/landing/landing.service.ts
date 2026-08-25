import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

export interface SaveLandingInput {
  template?: 'CLASSIC' | 'MINIMAL' | 'BOLD';
  hero?: unknown;
  faq?: unknown;
  contact?: unknown;
  seo?: unknown;
}

/**
 * Landing editor — `/schools/me/landing/*` owner-only signed tenant context,
 * entitlement va audit bilan (§4.1.1, §5.5). Unsafe HTML yo'q — faqat
 * structured JSON bloklar. Publish draft'ni guestga ochadi (published version).
 */
@Injectable()
export class LandingService {
  async get(schoolId: string) {
    const page = await prisma.schoolLandingPage.findUnique({ where: { schoolId } });
    if (!page) throw new NotFoundException('LANDING_NOT_FOUND');

    const [highlights, successStories, testimonials] = await Promise.all([
      prisma.landingHighlight.findMany({
        where: { schoolId },
        orderBy: { position: 'asc' },
      }),
      prisma.landingSuccessStory.findMany({
        where: { schoolId },
        orderBy: { position: 'asc' },
      }),
      prisma.landingTestimonial.findMany({
        where: { schoolId },
        orderBy: { position: 'asc' },
      }),
    ]);

    return { ...page, highlights, successStories, testimonials };
  }

  async save(schoolId: string, input: SaveLandingInput) {
    const existing = await prisma.schoolLandingPage.findUnique({ where: { schoolId } });
    if (!existing) throw new NotFoundException('LANDING_NOT_FOUND');

    return prisma.schoolLandingPage.update({
      where: { schoolId },
      data: {
        template: input.template ?? existing.template,
        heroJson: (input.hero as object) ?? existing.heroJson,
        faqJson: (input.faq as object) ?? existing.faqJson,
        contactJson: (input.contact as object) ?? existing.contactJson,
        seoJson: (input.seo as object) ?? existing.seoJson,
      },
    });
  }

  async publish(schoolId: string) {
    const existing = await prisma.schoolLandingPage.findUnique({ where: { schoolId } });
    if (!existing) throw new NotFoundException('LANDING_NOT_FOUND');

    return prisma.schoolLandingPage.update({
      where: { schoolId },
      data: {
        isPublished: true,
        publishedVersion: (existing.publishedVersion ?? 0) + 1,
        publishedAt: new Date(),
      },
    });
  }

  /** Owner-only preview token (1 soat, school-bound, signed) — Faza 2'da HMAC key bilan. */
  async addHighlight(schoolId: string, input: { label: string; value: string; iconKey?: string; position?: number }) {
    return prisma.landingHighlight.create({
      data: { schoolId, label: input.label, value: input.value, iconKey: input.iconKey, position: input.position ?? 0 },
    });
  }
}