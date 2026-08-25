import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

/**
 * Notifications (§4.2, §6.6). In-app + Telegram (P0). Channel consent §9.
 * Nonterior eventlari outbox orqali workerda yuboriladi (Faza 7 ops);
 * shu yerda asosiy create/list/read contract.
 */
@Injectable()
export class NotificationsService {
  async create(input: {
    userId: string;
    schoolId?: string;
    type: string;
    title: string;
    body?: string;
    data?: unknown;
  }) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        schoolId: input.schoolId,
        type: input.type,
        title: input.title,
        body: input.body,
        dataJson: input.data as object | undefined,
      },
    });
  }

  async list(userId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    if (result.count === 0) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    return { ok: true };
  }

  /** Telegram linking (deep-link /start <signed_nonce>) — P0 peace; chat-id link. */
  async linkTelegram(userId: string, telegramChatId: string) {
    const existing = await prisma.telegramLink.findUnique({
      where: { telegramChatId },
    });
    if (existing && existing.userId !== userId) {
      throw new ConflictException('TELEGRAM_ALREADY_LINKED');
    }
    return prisma.telegramLink.upsert({
      where: { telegramChatId },
      update: { userId, isActive: true },
      create: { userId, telegramChatId },
    });
  }
}