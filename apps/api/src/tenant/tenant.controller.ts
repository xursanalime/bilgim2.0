import { Controller, Get, Param } from '@nestjs/common';
import { type TenantResolverService } from './tenant-resolver.service';

/**
 * Internal tenant resolution — Next.js middleware (BFF) server-side chaqiradi
 * (§5.2). Internetdan to'g'ri-chamasi signed context talab: bu endpoint
 * internal TS'ga (x-internal-signature) faqat Faza 1'da HMAC bilan yopiladi.
 * Hozircha infaqat slug validlash + ACTIVE check.
 */
@Controller('internal/tenant')
export class TenantResolveController {
  constructor(private readonly resolver: TenantResolverService) {}

  @Get(':slug')
  async resolve(@Param('slug') slug: string) {
    return this.resolver.resolve(slug);
  }
}