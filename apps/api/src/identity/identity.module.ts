import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../config/env.provider';
import type { Env } from '../config/env.provider';
import { CryptoService } from './crypto.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountEntryService } from './account-entry.service';
import { AccountController } from './account.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Identity bounded context (§5.6). Global auth (register/login/refresh),
 * account-entry (my-schools read model) va tenant resolver.
 * Auth secret'lar env orqali DI bilan beriladi, logga yozilmaydi (§9).
 */
@Module({
  imports: [JwtModule.register({ global: true })],
  providers: [
    {
      provide: CryptoService,
      useFactory: (env: Env) => new CryptoService(env.AUTH_REFRESH_SECRET ?? ''),
      inject: [ENV],
    },
    AuthService,
    AccountEntryService,
    JwtAuthGuard,
  ],
  controllers: [AuthController, AccountController],
  exports: [JwtAuthGuard, AuthService, AccountEntryService],
})
export class IdentityModule {}