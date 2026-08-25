import { Controller, Get, Param, Header } from '@nestjs/common';
import { type PublicCatalogService } from './public-catalog.service';

/**
 * Public tenant endpoints (§5.5). Faqat server-rendered/public content —
 * hech qanday xususiy data. Guest/student/teacher bir xil minimal contract.
 */
@Controller('public/schools')
export class PublicController {
  constructor(private readonly catalogService: PublicCatalogService) {}

  @Get(':slug/catalog')
  @Header('Cache-Control', 'public, max-age=60')
  async catalog(@Param('slug') slug: string) {
    return this.catalogService.catalog(slug);
  }
}