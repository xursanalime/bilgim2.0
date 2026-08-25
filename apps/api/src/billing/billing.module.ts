import { Module, type OnModuleInit } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { QuotaService } from './quota.service';
import { BillingSeedingService } from './billing-seeding.service';
import { BillingController } from './billing.controller';
import { OrderService } from './order.service';
import { PaymeAdapter } from './payme.adapter';
import { OrdersController } from './orders.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';

@Module({
  providers: [EntitlementService, QuotaService, BillingSeedingService, OrderService, PaymeAdapter],
  controllers: [BillingController, OrdersController, PaymentsWebhookController],
  exports: [EntitlementService, QuotaService, BillingSeedingService, OrderService, PaymeAdapter],
})
export class BillingModule implements OnModuleInit {
  constructor(private readonly seeding: BillingSeedingService) {}

  async onModuleInit(): Promise<void> {
    // Boot da seed (idempotent) — FREE/PRO/MAX plan versiyalari mavjud bo'lishi
    // shart; aks holda entitlement guard barcha maktabda fail-closed bo'ladi.
    await this.seeding.seedPlatformPlans();
  }
}