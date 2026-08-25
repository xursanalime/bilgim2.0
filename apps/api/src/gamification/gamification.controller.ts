import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { RbacGuard } from '../authz/rbac.guard';
import { CurrentTenantId } from '../authz/current-tenant.decorator';
import { type GamificationService, XP_EVENTS } from './gamification.service';

/**
 * Student gamification (§4.3.1). Faqat o'z profilini ko'radi; boshqa student
 * profileId query qilinmaydi. Teacher/staff player bo'lolmaydi (service guard).
 */
@Controller('gamification')
@UseGuards(JwtAuthGuard, RbacGuard)
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('me')
  async me(@CurrentTenantId() schoolId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.gamification.me(schoolId, user.userId);
  }

  /**
   * Daily action → streak (source event). Client bu orqali arbitrary XP
   * yozolmaydi — faqat signletone event turi.
   */
  @Post('me/daily-action')
  @HttpCode(HttpStatus.OK)
  async dailyAction(
    @CurrentTenantId() schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { localDate?: string },
  ) {
    const localDay = body.localDate ? new Date(body.localDate) : new Date();
    return this.gamification.recordDailyAction(schoolId, user.userId, localDay);
  }
}

export { XP_EVENTS };