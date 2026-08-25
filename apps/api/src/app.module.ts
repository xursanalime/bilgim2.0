import { Module } from '@nestjs/common';
import { envProvider, ENV } from './config/env.provider';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { IdentityModule } from './identity/identity.module';
import { TenantModule } from './tenant/tenant.module';

/**
 * Modular monolith ildiz moduli (docs/bilgim2.0.md §5.6).
 * Har bir bounded context ularga mos alohida Nest moduli sifatida shu yerga
 * ulanadi. Faza 1: identity (auth + my-schools) va tenant resolver ulangan;
 * qolganlari keyingi fazalarda qo'shiladi (schools, catalog, enrollment,
 * learning, homework, ai, media, live, community, chat, notifications,
 * gamification, billing, analytics, platform-admin).
 */
@Module({
  imports: [IdentityModule, TenantModule],
  providers: [envProvider, MetricsService],
  controllers: [HealthController, MetricsController],
  exports: [ENV],
})
export class AppModule {}
