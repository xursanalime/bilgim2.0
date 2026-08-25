import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles } from '../authz/roles.decorator';
import { CurrentTenantId } from '../authz/current-tenant.decorator';
import { type EnrollmentService } from './enrollment.service';

/**
 * Enrollment endpoints (§4.1.1, §6.3).
 * — `/enrollments/me` — student'ning o'z enrollmentlari;
 * — `/enrollments/join` — signed intent orqali join (student);
 * — `/enrollments` — tenant'da staff ro'yxati (owner/teacher/assistant).
 */
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollments: EnrollmentService) {}

  @Get('me')
  async myEnrollments(@CurrentUser() user: AuthenticatedUser) {
    return this.enrollments.listMine(user.userId);
  }

  /** Signed intent orqali join — guest signup/login tugagach BFF chaqiradi (§4.1.1). */
  @Post('join')
  @HttpCode(HttpStatus.CREATED)
  async join(@CurrentUser() user: AuthenticatedUser, @Body() body: { intent: string }) {
    const intent = this.enrollments.verifyJoinIntent(body.intent);
    return this.enrollments.joinCourse(user.userId, {
      schoolId: intent.schoolId,
      cohortId: intent.cohortId ?? '',
    });
  }

  /** Tenant ichida — staff uchun; schoolId doim context'dan (query qabul qilinmaydi). */
  @Get()
  @UseGuards(RbacGuard)
  @Roles('OWNER', 'TEACHER', 'ASSISTANT')
  async tenantEnrollments(@CurrentTenantId() schoolId: string) {
    return this.enrollments.listForTenant(schoolId);
  }
}