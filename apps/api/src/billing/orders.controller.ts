import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { type OrderService, type CreateOrderInput } from './order.service';

interface CreateOrderBody {
  cohortId: string;
  couponCode?: string;
  idempotencyKey?: string;
}

/**
 * Student course checkout (tenant, §6.5). Server-side price (offerdan) —
 * client narxi qabul qilinmaydi. Order PENDING → Payme checkout (Faza 3
 * BFF tarafida dars URI) → webhook → ACTIVE enrollment.
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOrderBody) {
    const cohort = await importPrismaFindCohort(body.cohortId);
    const offer = cohort?.offers?.[0];
    if (!offer || !cohort) {
      return { error: 'COHORT_NOT_FOUND' };
    }
    const input: CreateOrderInput = {
      schoolId: cohort.schoolId,
      buyerUserId: user.userId,
      purpose: 'STUDENT_ENROLLMENT',
      referenceType: 'COHORT',
      referenceId: cohort.id,
      priceUzs: offer.priceUzs,
      couponCode: body.couponCode,
      idempotencyKey: body.idempotencyKey,
    };
    return this.orders.createOrder(input);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.orders.get(id);
  }
}

async function importPrismaFindCohort(cohortId: string) {
  const { prisma } = await import('@bilgim/db');
  return prisma.cohort.findUnique({
    where: { id: cohortId },
    include: { offers: { where: { isActive: true }, orderBy: { version: 'desc' }, take: 1 } },
  });
}