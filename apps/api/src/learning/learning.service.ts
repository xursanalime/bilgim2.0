import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

export interface LessonPlayer {
  enrollmentId: string;
  lesson: {
    id: string;
    slug: string;
    title: string;
    type: string;
    contentJson: unknown;
  };
  access: {
    available: boolean;
    availableAt: Date | null;
    completedAt: Date | null;
    lockedReason: string | null;
  };
}

/**
 * Learning — student lesson access (drip/completion, §4.3, §6.3).
 * LessonAccess server hisoblaydi; frontend faqat ko'rsatadi (§4.3).
 * Resource lookup doim `schoolId` bilan (§5.2); browser "obuna bo'ldim"
 * flagiga ishonilmaydi (§4.3).
 */
@Injectable()
export class LearningService {
  /** Student'ning o'z course'lari — /learn dasboard uchun. */
  async studentDashboard(studentUserId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentUserId, status: 'ACTIVE' },
      select: {
        id: true,
        schoolId: true,
        activatedAt: true,
        expiresAt: true,
        course: { select: { id: true, slug: true, title: true, coverAssetId: true } },
        cohort: { select: { title: true, startsAt: true, endsAt: true } },
        lessonAccess: {
          select: { completedAt: true },
        },
      },
      orderBy: { activatedAt: 'desc' },
    });

    return enrollments.map((e) => {
      const total = e.lessonAccess.length;
      const completed = e.lessonAccess.filter((la) => la.completedAt).length;
      return {
        enrollmentId: e.id,
        schoolId: e.schoolId,
        course: e.course,
        cohort: e.cohort,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  /** Lesson player — active enrollment + lesson access asosida. */
  async openLesson(studentUserId: string, input: { courseId: string; lessonSlug: string }) {
    const lesson = await prisma.lesson.findFirst({
      where: { courseId: input.courseId, slug: input.lessonSlug },
    });
    if (!lesson) throw new NotFoundException('LESSON_NOT_FOUND');

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentUserId,
        courseId: input.courseId,
        status: 'ACTIVE',
      },
      select: { id: true, schoolId: true },
    });
    if (!enrollment) throw new ForbiddenException('ENROLLMENT_REQUIRED');

    const access = await prisma.lessonAccess.findUnique({
      where: {
        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id },
      },
      select: { availableAt: true, completedAt: true, lockedReason: true },
    });

    const isAvailable =
      !!access &&
      !access.lockedReason &&
      (!access.availableAt || access.availableAt <= new Date()) &&
      !access.completedAt;

    // Takroriy ochish ham mumkin — komplayens (drip) server tarafida.
    return {
      enrollmentId: enrollment.id,
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        type: lesson.type,
        contentJson: isAvailable || !!access?.completedAt ? lesson.contentJson : null,
      },
      access: {
        available: !!access && !access.lockedReason && (!access.availableAt || access.availableAt <= new Date()),
        availableAt: access?.availableAt ?? null,
        completedAt: access?.completedAt ?? null,
        lockedReason: access?.lockedReason ?? null,
      },
    };
  }

  /** Completion — video 90% yoki explicit; dedupe source event (§6.3). */
  async completeLesson(
    studentUserId: string,
    input: { courseId: string; lessonSlug: string; sourceKey: string },
  ) {
    const lesson = await prisma.lesson.findFirst({
      where: { courseId: input.courseId, slug: input.lessonSlug },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException('LESSON_NOT_FOUND');

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentUserId, courseId: input.courseId, status: 'ACTIVE' },
      select: { id: true, schoolId: true },
    });
    if (!enrollment) throw new ForbiddenException('ENROLLMENT_REQUIRED');

    // Idempotent: source event bir marta (dedupe, §6.3 unique source_key).
    const existingEvent = await prisma.lessonProgressEvent.findUnique({
      where: { sourceKey: input.sourceKey },
      select: { id: true },
    });
    if (existingEvent) return { ok: true, alreadyCompleted: true };

    await prisma.$transaction(async (tx) => {
      await tx.lessonProgressEvent.create({
        data: {
          schoolId: enrollment.schoolId,
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          eventType: 'COMPLETE',
          sourceKey: input.sourceKey,
        },
      });
      await tx.lessonAccess.upsert({
        where: {
          enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id },
        },
        update: { completedAt: new Date(), lockedReason: null },
        create: {
          enrollmentId: enrollment.id,
          lessonId: lesson.id,
          schoolId: enrollment.schoolId,
          completedAt: new Date(),
          availableAt: new Date(),
        },
      });
    });

    return { ok: true, alreadyCompleted: false };
  }
}