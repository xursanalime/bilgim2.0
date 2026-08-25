import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { collectDefaultMetrics, Registry } from 'prom-client';

/**
 * Prometheus metrikalari uchun yagona registry.
 * Default Node.js/HTTP metrikalari bilan boshlanadi; domain metrikalar
 * keyingi fazalarda shu registryga qo'shiladi.
 */
@Injectable()
export class MetricsService implements OnModuleDestroy {
  readonly registry = new Registry();

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }

  onModuleDestroy(): void {
    // Interval timerlarni to'xtatish — test va dev watch rejimida leak bo'lmasin
    this.registry.clear();
  }
}
