import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { CurrentTenantId } from '../authz/current-tenant.decorator';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles } from '../authz/roles.decorator';
import { type HomeworkService } from './homework.service';

@Controller('homework')
@UseGuards(JwtAuthGuard)
export class HomeworkController {
  constructor(private readonly homework: HomeworkService) {}

  /** Student — lesson assignmentlari. */
  @Get('lessons/:lessonId')
  async byLesson(
    @CurrentTenantId() schoolId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.homework.listForLesson(schoolId, lessonId, user.userId);
  }

  @Post('assignments/:assignmentId/draft')
  @HttpCode(HttpStatus.OK)
  async draft(
    @CurrentTenantId() schoolId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { answers: unknown; enrollmentId?: string },
  ) {
    return this.homework.saveDraft({
      schoolId,
      assignmentId,
      studentUserId: user.userId,
      enrollmentId: body.enrollmentId,
      answers: body.answers,
    });
  }

  @Post('assignments/:assignmentId/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @CurrentTenantId() schoolId: string,
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.homework.submit({ schoolId, assignmentId, studentUserId: user.userId });
  }

  /** Teacher grade — RBAC: owner/teacher/assistant emas student. */
  @Post('submissions/:submissionId/grade')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @Roles('OWNER', 'TEACHER')
  async grade(
    @CurrentTenantId() schoolId: string,
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.homework.grade({
      schoolId,
      submissionId,
      graderMemberId: user.userId,
      score: body.score,
      feedback: body.feedback,
    });
  }
}