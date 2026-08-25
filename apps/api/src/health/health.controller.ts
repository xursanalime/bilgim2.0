import { Controller, Get } from '@nestjs/common';

/**
 * Liveness/readiness endpointi. Faza 0'da statik "ok"; DB/Redis probe'lari
 * keyingi fazalarda shu endpointga qo'shiladi.
 */
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok' as const,
      service: 'bilgim-api',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
