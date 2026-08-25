import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@bilgim/db';

export interface CreateCourseInput {
  title: string;
  slug: string;
  description?: string;
  level?: string;
}

export interface PublishCourseInput {
  courseId: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'ARCHIVED' | 'DRAFT';
}

/**
 * Catalog bounded context — courses/lessons (§4.3, §6.3). Barcha query'lar
 * `schoolId` bilan scope qilinadi; resource `where { id, schoolId }` majburiy
 * (§5.2). Published revision immutable — draft/edit yangi version.
 */
@Injectable()
export class CatalogService {
  async listCourses(schoolId: string, onlyPublic = false) {
    return prisma.course.findMany({
      where: { schoolId, ...(onlyPublic ? { visibility: 'PUBLIC' } : {}) },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        visibility: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourse(schoolId: string, courseIdOrSlug: string) {
    const course = await prisma.course.findFirst({
      where: {
        schoolId,
        OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
      },
      include: {
        sections: {
          where: { isPublished: true },
          include: { lessons: { where: { status: 'PUBLISHED' }, orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        cohorts: {
          where: { status: { in: ['ACTIVE', 'FULL'] } },
          include: {
            offers: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 },
          },
          orderBy: { startsAt: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('COURSE_NOT_FOUND');
    return course;
  }

  async getCourseForPublic(schoolId: string, courseSlug: string) {
    const course = await prisma.course.findFirst({
      where: { schoolId, slug: courseSlug, visibility: 'PUBLIC' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        level: true,
        sections: {
          where: { isPublished: true },
          select: { id: true, title: true, position: true, lessons: {
            where: { status: 'PUBLISHED' },
            select: { id: true, slug: true, title: true, type: true, estimatedMinutes: true },
            orderBy: { position: 'asc' },
          }},
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('COURSE_NOT_FOUND');
    return course;
  }

  async createCourse(schoolId: string, input: CreateCourseInput) {
    const existing = await prisma.course.findFirst({
      where: { schoolId, slug: input.slug },
      select: { id: true },
    });
    if (existing) throw new ConflictException('COURSE_SLUG_TAKEN');

    return prisma.course.create({
      data: {
        schoolId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        level: input.level,
        visibility: 'DRAFT',
      },
    });
  }

  async updateVisibility(schoolId: string, courseId: string, visibility: PublishCourseInput['visibility']) {
    const course = await prisma.course.findFirst({ where: { schoolId, id: courseId } });
    if (!course) throw new NotFoundException('COURSE_NOT_FOUND');
    if (course.schoolId !== schoolId) throw new ForbiddenException('NOT_YOUR_COURSE');

    return prisma.course.update({
      where: { id: courseId },
      data: { visibility, version: { increment: 1 } },
    });
  }

  /** Sections/lessons yaratish — draft-only (published ga to'g'ridan o'tish yo'q). */
  async createLesson(
    schoolId: string,
    input: {
      courseId: string;
      sectionId?: string;
      slug: string;
      title: string;
      type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'LIVE' | 'HYBRID';
      position?: number;
    },
  ) {
    const course = await prisma.course.findFirst({
      where: { id: input.courseId, schoolId },
      select: { id: true, visibility: true },
    });
    if (!course) throw new NotFoundException('COURSE_NOT_FOUND');
    if (course.visibility !== 'DRAFT') throw new ForbiddenException('COURSE_NOT_DRAFT');

    const dup = await prisma.lesson.findFirst({ where: { courseId: input.courseId, slug: input.slug } });
    if (dup) throw new ConflictException('LESSON_SLUG_TAKEN');

    const position =
      input.position ??
      ((await prisma.lesson.count({ where: { courseId: input.courseId } })) + 1);

    return prisma.lesson.create({
      data: {
        schoolId,
        courseId: input.courseId,
        sectionId: input.sectionId,
        slug: input.slug,
        title: input.title,
        type: input.type,
        status: 'DRAFT',
        position,
      },
    });
  }

  async publishLesson(schoolId: string, lessonId: string) {
    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, schoolId } });
    if (!lesson) throw new NotFoundException('LESSON_NOT_FOUND');
    return prisma.lesson.update({
      where: { id: lessonId },
      data: { status: 'PUBLISHED' },
    });
  }
}