import { Module } from '@nestjs/common';
import { TenantResolverService } from './tenant-resolver.service';
import { TenantResolveController } from './tenant.controller';

@Module({
  providers: [TenantResolverService],
  controllers: [TenantResolveController],
  exports: [TenantResolverService],
})
export class TenantModule {}