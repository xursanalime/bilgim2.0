import { Module } from '@nestjs/common';
import { PublicCatalogService } from './public-catalog.service';
import { PublicController } from './public.controller';

@Module({
  providers: [PublicCatalogService],
  controllers: [PublicController],
})
export class PublicModule {}