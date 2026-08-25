import { Module } from '@nestjs/common';
import { envProvider, ENV } from './config/env.provider';
import { HealthController } from './health/health.controller';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';

/**
 * Modular monolith ildiz moduli (docs/bilgim2.0.md §5.6).
 * Har bir bounded context keyinchalik alohida Nest moduli sifatida
 * shu yerga ulanadi: identity, schools, catalog, enrollment, learning,
 * homework, ai, media, live, community, chat, notifications, gamification,
 * billing, analytics, platform-admin.
 */
@Module({
  providers: [envProvider, MetricsService],
  controllers: [HealthController, MetricsController],
  exports: [ENV],
})
export class AppModule {}
