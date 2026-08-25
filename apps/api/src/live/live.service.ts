import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import type { RecordingState } from '@bilgim/db';

/**
 * Live bounded context (§5.6, §7). Production: LiveKit Cloud.
 * — Schedule: recording_state=OFF; schedule recording so'ramaydi/hech qanday
 *   recorder job yaratmaydi (§7.2.1);
 * — Recording state machine: OFF→REQUESTED(approved)|APPROVED(student request)
 *   →[host approve]→APPROVED→RECORDING→finalize. Faqat RECORDING'da Egress.
 */
@Injectable()
export class LiveService {
  async schedule(input: {
    schoolId: string;
    title: string;
    scheduledAt: Date;
    lessonId?: string;
    hostMemberId?: string;
  }) {
    const session = await prisma.liveSession.create({
      data: {
        schoolId: input.schoolId,
        lessonId: input.lessonId,
        title: input.title,
        scheduledAt: input.scheduledAt,
        state: 'SCHEDULED',
        hostMemberId: input.hostMemberId,
        recordingState: 'OFF',
      },
    });
    return session;
  }

  /** Teacher explicit request → APPROVED (entitlement+quota controller/guard
   * darajasida tekshiriladi). Student request → REQUESTED (§7.2.1). */
  async requestRecording(sessionId: string, requesterMemberId: string, isTeacher: boolean) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    if (session.recordingState === 'RECORDING') throw new ConflictException('ALREADY_RECORDING');

    const target: RecordingState = isTeacher ? 'APPROVED' : 'REQUESTED';
    return prisma.liveSession.update({
      where: { id: sessionId },
      data: { recordingState: target, recordingRequesterId: requesterMemberId },
      select: { id: true, recordingState: true },
    });
  }

  /** Host approve → APPROVED; decline → DECLINED. */
  async decideRecording(sessionId: string, approve: boolean) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    if (session.recordingState !== 'REQUESTED' && session.recordingState !== 'APPROVED') {
      throw new ConflictException('RECORDING_NOT_PENDING');
    }
    return prisma.liveSession.update({
      where: { id: sessionId },
      data: { recordingState: approve ? 'APPROVED' : 'DECLINED' },
      select: { id: true, recordingState: true },
    });
  }

  /** RECORDING'ga o'tish — Egress startidan oldin; APPROVED preflight. */
  async startRecording(sessionId: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    if (session.recordingState !== 'APPROVED') {
      throw new ConflictException('RECORDING_NOT_APPROVED');
    }
    return prisma.liveSession.update({
      where: { id: sessionId },
      data: { recordingState: 'RECORDING' },
      select: { id: true, recordingState: true },
    });
  }

  /** RECORDING to'xtatish — Egress finalize; Recording row immutable lifecycle. */
  async stopRecording(sessionId: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session || session.recordingState !== 'RECORDING') {
      throw new NotFoundException('RECORDING_NOT_ACTIVE');
    }
    return prisma.liveSession.update({
      where: { id: sessionId },
      data: { recordingState: 'OFF' },
    });
  }

  /** Join — entitlement o'tgandan keyin participant entry + attendance. */
  async join(sessionId: string, userId: string | null, guestName?: string) {
    const session = await prisma.liveSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('SESSION_NOT_FOUND');
    if (session.state !== 'LIVE' && session.state !== 'PRE_JOIN') {
      throw new ConflictException('SESSION_NOT_OPEN');
    }

    if (userId) {
      await prisma.liveParticipant.upsert({
        where: { sessionId_userId: { sessionId, userId } },
        update: { joinedAt: new Date(), leftAt: null },
        create: { sessionId, userId, joinedAt: new Date() },
      });
    } else {
      await prisma.liveParticipant.create({
        data: { sessionId, guestName: guestName ?? 'Guest', joinedAt: new Date() },
      });
    }
    return { joined: true, recordingState: session.recordingState };
  }
}