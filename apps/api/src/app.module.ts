import { Module } from '@nestjs/common';
import { envProvider, ENV } from './config/env.provider';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';
import { IdentityModule } from './identity/identity.module';
import { TenantModule } from './tenant/tenant.module';
import { AuthzModule } from './authz/authz.module';
import { SchoolsModule } from './schools/schools.module';

/**
 * Modular monolith ildiz moduli (docs/bilgim2.0.md §5.6).
 * Har bir bounded context ularga mos alohida Nest moduli sifatida shu yerga
 * ulanadi. Faza 1: identity (auth + my-schools), tenant resolver, authz
 * (RBAC + tenant context) va schools (provisioning + brand).
 */
@Module({
  imports: [IdentityModule, TenantModule, AuthzModule, SchoolsModule],
  providers: [envProvider, MetricsService],
  controllers: [HealthController, MetricsController],
  exports: [ENV],
})
export class AppModule {}
