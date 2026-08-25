import { Module } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { SchoolsController, OpenSchoolController } from './schools.controller';

@Module({
  providers: [SchoolsService],
  controllers: [SchoolsController, OpenSchoolController],
  exports: [SchoolsService],
})
export class SchoolsModule {}