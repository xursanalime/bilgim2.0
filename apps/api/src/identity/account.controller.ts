import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { type AccountEntryService, type AppEntryResolver } from './account-entry.service';

/**
 * Account-level exception endpoint (§2.2, §5.5). Tenant contextni qabul
 * qilmaydi, tenant resource ID ham qabul qilmaydi. Faqat minimal
 * MySchoolCard[] summary qaytaradi. Cache: private, no-store.
 */
@Controller('account')
export class AccountController {
  constructor(
    private readonly accountEntry: AccountEntryService,
    private readonly appEntry: AppEntryResolver,
  ) {}

  @Get('my-schools')
  @UseGuards(JwtAuthGuard)
  async mySchools(@CurrentUser() user: AuthenticatedUser) {
    return this.accountEntry.mySchools(user.userId);
  }

  /** Root login tugagach redirect qarori (§2.2). */
  @Get('entry')
  @UseGuards(JwtAuthGuard)
  async entry(@CurrentUser() user: AuthenticatedUser) {
    return this.appEntry.resolve(user.userId);
  }
}