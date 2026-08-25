import { Module } from '@nestjs/common';
import { LandingService } from './landing.service';
import { LandingController } from './landing.controller';

@Module({
  providers: [LandingService],
  controllers: [LandingController],
})
export class LandingModule {}