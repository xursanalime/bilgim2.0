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
import { type LearningService } from './learning.service';

/**
 * Learning endpoints (student, §2.2):
 * — /learn/dashboard — /learn dash;
 * — /learn/courses/:courseId/lessons/:lessonSlug — player (LessonAccess check);
 * — /learn/.../complete — idempotent completion.
 */
@Controller('learn')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('dashboard')
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.learning.studentDashboard(user.userId);
  }

  @Get('courses/:courseId/lessons/:lessonSlug')
  async openLesson(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.learning.openLesson(user.userId, { courseId, lessonSlug });
  }

  @Post('courses/:courseId/lessons/:lessonSlug/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Param('lessonSlug') lessonSlug: string,
    @Body() body: { sourceKey: string },
  ) {
    if (!body.sourceKey) return { ok: false, error: 'SOURCE_KEY_REQUIRED' };
    return this.learning.completeLesson(user.userId, { courseId, lessonSlug, sourceKey: body.sourceKey });
  }
}