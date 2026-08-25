import { Module } from '@nestjs/common';
import { envProvider, ENV } from './config/env.provider';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { IdentityModule } from './identity/identity.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthzModule } from './authz/authz.module';
import { SchoolsModule } from './schools/schools.module';
import { CatalogModule } from './catalog/catalog.module';
import { PublicModule } from './public/public.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { LandingModule } from './landing/landing.module';
import { LearningModule } from './learning/learning.module';
import { BillingModule } from './billing/billing.module';
import { GamificationModule } from './gamification/gamification.module';
import { HomeworkModule } from './homework/homework.module';
import { LiveModule } from './live/live.module';
import { NotificationsModule } from './notifications/notifications.module';

/**
 * Modular monolith ildiz moduli (docs/bilgim2.0.md §5.6).
 * Har bir bounded context ularga mos alohida Nest moduli sifatida shu yerga
 * ulanadi. Faza 1: identity, tenant resolver, authz, schools. Faza 2:
 * catalog, public (tenant storefront).
 */
@Module({
  imports: [
    IdentityModule,
    TenantModule,
    AuthzModule,
    SchoolsModule,
    CatalogModule,
    PublicModule,
    EnrollmentModule,
    LandingModule,
    LearningModule,
    BillingModule,
    GamificationModule,
    HomeworkModule,
    LiveModule,
    NotificationsModule,
  ],
  providers: [envProvider, MetricsService],
  controllers: [HealthController, MetricsController],
  exports: [ENV],
})
export class AppModule {}
