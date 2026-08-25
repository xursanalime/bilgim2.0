import { Controller, Get, UseGuards } from '@nestjs/common';
import { prisma } from '@bilgim/db';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles } from '../authz/roles.decorator';
import { CurrentTenantId } from '../authz/current-tenant.decorator';

/**
 * SaaS billing — owner faqat o'z maktabi plan/usageini ko'radi (§2.2,
 * §4.4). Bu yerda UI read; mutation/payment Faza 3 keyingi qadamlarida.
 */
@Controller('billing')
@UseGuards(JwtAuthGuard, RbacGuard)
export class BillingController {
  @Get('me')
  @Roles('OWNER', 'ASSISTANT')
  async me(@CurrentTenantId() schoolId: string) {
    const [subscription, wallet, entitlements, usage] = await Promise.all([
      prisma.schoolSubscription.findFirst({
        where: { schoolId },
        orderBy: { subscriptionVersion: 'desc' },
        select: { state: true, subscriptionVersion: true, monthlyPriceUzs: true, periodStart: true, periodEnd: true, allowPaidOverage: true, plan: { select: { code: true, displayName: true } } },
      }),
      prisma.usageWallet.findUnique({ where: { schoolId }, select: { available: true, reserved: true } }),
      prisma.schoolSubscriptionEntitlement.findMany({
        where: { subscription: { schoolId } },
        select: { featureKey: true, enabled: true, limitValue: true },
        orderBy: { featureKey: 'asc' },
      }),
      prisma.entitlementUsage.findMany({
        where: { subscription: { schoolId } },
        select: { featureKey: true, periodStart: true, reserved: true, actual: true },
      }),
    ]);

    return {
      subscription: subscription
        ? { ...subscription, plan: subscription.plan, priceUzs: subscription.monthlyPriceUzs }
        : null,
      wallet: wallet ?? { available: 0, reserved: 0 },
      entitlements,
      usage,
    };
  }
}