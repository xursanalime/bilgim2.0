import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface SignedIntentPayload {
  schoolId: string;
  courseId?: string;
  cohortId?: string;
  purpose: 'JOIN_COURSE';
  exp: number;
}

const INTENT_TTL_MS = 30 * 60 * 1000; // 30 daqiqa (docs §4.1.1)

/**
 * Enrollment / conversion (§4.1.1):
 * — signed join intent (join code) faqat school/course/cohort va 30min expiry;
 * — klient yuborgan course ID yoki external returnTo authority emas;
 * — free/auto-admit cohort → ACTIVE enrollment; approval-required →
 *   PENDING_APPROVAL; paid → order oqimi (Faza 3'da provider).
 */
@Injectable()
export class EnrollmentService {
  constructor(private readonly secret: string) {}

  signJoinIntent(input: { schoolId: string; cohortId: string; purpose: 'JOIN_COURSE' }): string {
    const payload: SignedIntentPayload = {
      ...input,
      exp: Date.now() + INTENT_TTL_MS,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = this.sign(body);
    return `${body}.${sig}`;
  }

  verifyJoinIntent(token: string): SignedIntentPayload {
    const [body, sig] = token.split('.');
    if (!body || !sig) throw new BadRequestException('INTENT_INVALID');
    const expected = this.sign(body);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new BadRequestException('INTENT_INVALID');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedIntentPayload;
    if (!payload.schoolId || payload.purpose !== 'JOIN_COURSE') {
      throw new BadRequestException('INTENT_INVALID');
    }
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      throw new BadRequestException('INTENT_EXPIRED');
    }
    return payload;
  }

  async joinCourse(userId: string, input: { schoolId: string; cohortId: string }) {
    const cohort = await prisma.cohort.findFirst({
      where: { id: input.cohortId, schoolId: input.schoolId },
      include: {
        offers: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!cohort) throw new NotFoundException('COHORT_NOT_FOUND');
    if (cohort.status === 'CANCELLED' || cohort.status === 'ENDED') {
      throw new ConflictException('COHORT_NOT_OPEN');
    }

    const existing = await prisma.enrollment.findFirst({
      where: { schoolId: input.schoolId, studentUserId: userId, cohortId: input.cohortId },
      select: { status: true },
    });
    if (existing) {
      if (['ACTIVE', 'COMPLETED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'].includes(existing.status)) {
        throw new ConflictException('ALREADY_ENROLLED');
      }
    }

    const offer = cohort.offers[0];
    const course = await prisma.course.findUniqueOrThrow({ where: { id: cohort.courseId } });

    let status: 'ACTIVE' | 'PENDING_APPROVAL' | 'PENDING_PAYMENT' = 'PENDING_APPROVAL';
    let activatedAt: Date | null = null;

    if (offer && offer.billingModel !== 'FREE') {
      // Paid — Faza 3'da Order/Payme; hozircha intent orqali PENDING_PAYMENT.
      status = 'PENDING_PAYMENT';
    } else if (offer?.billingModel === 'FREE') {
      status = 'ACTIVE';
      activatedAt = new Date();
    } else {
      status = offer?.enrollmentApproval ? 'PENDING_APPROVAL' : 'ACTIVE';
      if (status === 'ACTIVE') activatedAt = new Date();
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        schoolId: input.schoolId,
        studentUserId: userId,
        courseId: course.id,
        cohortId: cohort.id,
        status,
        accessSource: 'MANUAL',
        offerVersion: offer?.version,
        activatedAt,
      },
    });

    if (status === 'ACTIVE') {
      await this.provisionLessonAccess(enrollment.id, input.schoolId, course.id);
    }

    return { enrollmentId: enrollment.id, status, requiresPayment: status === 'PENDING_PAYMENT' };
  }

  /** Active enrollment'ga barcha published lessonlar uchun LessonAccess yaratadi. */
  private async provisionLessonAccess(enrollmentId: string, schoolId: string, courseId: string) {
    const lessons = await prisma.lesson.findMany({
      where: { schoolId, courseId, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (lessons.length === 0) return;
    await prisma.lessonAccess.createMany({
      data: lessons.map((lesson) => ({
        enrollmentId,
        lessonId: lesson.id,
        schoolId,
        availableAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  /** Student'ning o'z enrollmentlari — faqat o'zi (tenant scope emas, istalgan maktabida). */
  async listMine(userId: string) {
    return prisma.enrollment.findMany({
      where: { studentUserId: userId },
      select: {
        id: true,
        schoolId: true,
        status: true,
        accessSource: true,
        activatedAt: true,
        expiresAt: true,
        course: { select: { id: true, slug: true, title: true } },
        cohort: { select: { id: true, title: true, startsAt: true, endsAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tenant ichida — staff uchun; schoolId doim context'dan, query/body'dan emas. */
  async listForTenant(schoolId: string) {
    return prisma.enrollment.findMany({
      where: { schoolId },
      include: {
        course: { select: { slug: true, title: true } },
        cohort: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }
}