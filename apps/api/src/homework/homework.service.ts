import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

/**
 * Homework bounded context (§4.3, §6.4). `submissions.final_score` faqat
 * server-side transaction: teacher accepted score yoki deterministic
 * auto-score. Client `score=100` yuborsa → ignore (fail-closed).
 * Module enumlari faqat server runtime bor bo'lsa ishlaydi.
 */
@Injectable()
export class HomeworkService {
  /** Student — lesson assignmentlari va o'z submissioni. */
  async listForLesson(schoolId: string, lessonId: string, studentUserId: string | null) {
    const assignments = await prisma.assignment.findMany({
      where: { schoolId, lessonId, status: 'PUBLISHED' },
      include: { modules: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!studentUserId) return { assignments };

    // Student faqat o'z submissionini ko'radi.
    const submissions = await prisma.submission.findMany({
      where: { assignmentId: { in: assignments.map((a) => a.id) }, studentUserId },
    });
    const subByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
    return {
      assignments: assignments.map((a) => ({ ...a, submission: subByAssignment.get(a.id) ?? null })),
    };
  }

  /** Submission upsert (draft) — javob klientdan, score serverda emas. */
  async saveDraft(input: {
    schoolId: string;
    assignmentId: string;
    studentUserId: string;
    enrollmentId?: string;
    answers: unknown;
  }) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: input.assignmentId, schoolId: input.schoolId },
      select: { id: true },
    });
    if (!assignment) throw new NotFoundException('ASSIGNMENT_NOT_FOUND');

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentUserId: {
          assignmentId: input.assignmentId,
          studentUserId: input.studentUserId,
        },
      },
      update: { answersJson: input.answers as object, status: 'DRAFT' },
      create: {
        schoolId: input.schoolId,
        assignmentId: input.assignmentId,
        studentUserId: input.studentUserId,
        enrollmentId: input.enrollmentId,
        answersJson: input.answers as object,
        status: 'DRAFT',
      },
    });
    return submission;
  }

  /** Submit — status SUBMITTED, submittedAt set; hech qachon score yozmaydi. */
  async submit(input: { schoolId: string; assignmentId: string; studentUserId: string }) {
    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_studentUserId: {
          assignmentId: input.assignmentId,
          studentUserId: input.studentUserId,
        },
      },
    });
    if (!submission) throw new NotFoundException('SUBMISSION_NOT_FOUND');

    return prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  /**
   * Teacher grade — final_score faqat server transactionda teacher tomonidan
   * qo'yiladi; oldingi AI/auto score immersive history saqlanadi.
   */
  async grade(input: {
    schoolId: string;
    submissionId: string;
    graderMemberId: string;
    score: number;
    feedback?: string;
  }) {
    const submission = await prisma.submission.findFirst({
      where: { id: input.submissionId, schoolId: input.schoolId },
    });
    if (!submission) throw new NotFoundException('SUBMISSION_NOT_FOUND');
    if (input.score < 0 || input.score > (await maxPoints(submission.assignmentId))) {
      return { error: 'SCORE_OUT_OF_RANGE' };
    }

    const scoreRow = await prisma.submissionScore.create({
      data: {
        submissionId: input.submissionId,
        source: 'TEACHER',
        score: input.score,
        maxScore: 100,
        rubricVersion: 1,
      },
    });

    await prisma.submission.update({
      where: { id: input.submissionId },
      data: { status: 'GRADED', finalScore: input.score, finalGrader: input.graderMemberId },
    });

    if (input.feedback) {
      await prisma.feedback.create({
        data: {
          submissionId: input.submissionId,
          authorUserId: input.graderMemberId,
          body: input.feedback,
          visibility: 'STUDENT',
          isFinalMarker: true,
        },
      });
    }

    return { ok: true, scoreId: scoreRow.id };
  }
}

async function maxPoints(assignmentId: string): Promise<number> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { maxPoints: true },
  });
  return assignment?.maxPoints ?? 100;
}