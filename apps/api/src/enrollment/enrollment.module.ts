import { Module } from '@nestjs/common';
import { ENV } from '../config/env.provider';
import type { Env } from '../config/env.provider';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';

@Module({
  providers: [
    {
      provide: EnrollmentService,
      // Join-intent HMAC kaliti — AUTH_ACCESS_SECRET'dan (standalone, logga yo'q).
      useFactory: (env: Env) => new EnrollmentService(env.AUTH_ACCESS_SECRET ?? ''),
      inject: [ENV],
    },
  ],
  controllers: [EnrollmentController],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}