import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { SchoolsService } from './schools.service';
import { SchoolsController, OpenSchoolController } from './schools.controller';

@Module({
  imports: [BillingModule],
  providers: [SchoolsService],
  controllers: [SchoolsController, OpenSchoolController],
  exports: [SchoolsService],
})
export class SchoolsModule {}