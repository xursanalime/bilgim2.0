import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@bilgim/db';

export interface CreateOrderInput {
  schoolId: string;
  buyerUserId: string;
  purpose: string;
  referenceType: string;
  referenceId: string;
  priceUzs: number;
  couponCode?: string;
  idempotencyKey?: string;
}

/**
 * Orders bounded context (§4.3 pricing, §6.5). Idempotency: scope
 * `schoolId:userId:method:path:key` (§5.4); payment webhooks provider
 * transaction id bo'yicha dedupe.
 */
@Injectable()
export class OrderService {
  async createOrder(input: CreateOrderInput) {
    if (input.idempotencyKey) {
      const dup = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (dup) return dup;
    }

    let discountUzs = 0;
    if (input.couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: input.couponCode.toLowerCase() } });
      if (coupon) {
        discountUzs = coupon.discountFixedUzs ?? 0;
        if (coupon.discountPercent) {
          discountUzs = Math.round((input.priceUzs * coupon.discountPercent) / 100);
        }
        if (discountUzs > input.priceUzs) discountUzs = input.priceUzs;
      }
    }

    const order = await prisma.order.create({
      data: {
        schoolId: input.schoolId,
        buyerUserId: input.buyerUserId,
        purpose: input.purpose,
        status: 'PENDING',
        subtotalUzs: input.priceUzs,
        discountUzs,
        totalUzs: Math.max(0, input.priceUzs - discountUzs),
        idempotencyKey: input.idempotencyKey,
        items: {
          create: {
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            quantity: 1,
            unitUzs: input.priceUzs,
            totalUzs: input.priceUzs,
          },
        },
      },
    });

    return order;
  }

  /** Fulfill — to'lov tasdiqlanganda enrollment/activatsiya (provider webhook). */
  async fulfillEnrollmentOrder(orderId: string) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    if (order.status === 'COMPLETED') return;

    const item = order.items[0];
    if (!item || item.referenceType !== 'COHORT') return;

    const existing = await prisma.enrollment.findFirst({
      where: {
        schoolId: order.schoolId,
        studentUserId: order.buyerUserId,
        cohortId: item.referenceId,
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.enrollment.updateMany({
        where: { id: existing.id, status: 'PENDING_PAYMENT' },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      });
    } else {
      const cohort = await prisma.cohort.findUniqueOrThrow({ where: { id: item.referenceId } });
      await prisma.enrollment.create({
        data: {
          schoolId: order.schoolId,
          studentUserId: order.buyerUserId,
          courseId: cohort.courseId,
          cohortId: cohort.id,
          status: 'ACTIVE',
          accessSource: 'ORDER',
          activatedAt: new Date(),
        },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });
  }

  async cancelOrder(orderId: string) {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELED' },
      select: { id: true, status: true },
    });
    return order;
  }

  async get(orderId: string): Promise<unknown> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return order;
  }
}