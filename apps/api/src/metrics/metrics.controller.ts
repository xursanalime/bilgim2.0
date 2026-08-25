import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
// MetricsService constructorga injekt qilinadi — runtime import talab (DI uchun),
// shuning uchun type-only import emas.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpointi. Faqat server-to-server; bu yerda
 * hech qanday tenant yoki PII metrikasi bo'lmasligi shart.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async getMetrics(@Res() res: Response): Promise<void> {
    const body = await this.metrics.render();
    res.type(this.metrics.contentType()).send(body);
  }
}
