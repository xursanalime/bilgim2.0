import {
  Body,
  Controller,
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
import { RequireEntitlement } from '../authz/entitlement.decorator';
import { FEATURE_KEYS } from '../billing/entitlement.service';
import { type LiveService } from './live.service';

/**
 * Live (§7). Recording default OFF; entitlement live.recording talab.
 * Student request → REQUESTED (teacher approvalsiz yozuv boshlamaydi).
 */
@Controller('live-sessions')
@UseGuards(JwtAuthGuard, RbacGuard)
export class LiveController {
  constructor(private readonly live: LiveService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('OWNER', 'TEACHER', 'ASSISTANT')
  async schedule(
    @CurrentTenantId() schoolId: string,
    @Body() body: { title: string; scheduledAt: string; lessonId?: string },
  ) {
    return this.live.schedule({
      schoolId,
      title: body.title,
      scheduledAt: new Date(body.scheduledAt),
      lessonId: body.lessonId,
    });
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  async join(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    // Attendance + entitlement — student/teacher join.
    return this.live.join(id, user.userId);
  }

  @Post(':id/recording/request')
  @HttpCode(HttpStatus.OK)
  @RequireEntitlement(FEATURE_KEYS.live_recording)
  async requestRecording(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.live.requestRecording(id, user.userId, false);
  }

  @Post(':id/recording/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER', 'TEACHER')
  @RequireEntitlement(FEATURE_KEYS.live_recording)
  async approveRecording(@Param('id') id: string, @Body() body: { approve: boolean }) {
    return this.live.decideRecording(id, body.approve ?? true);
  }

  @Post(':id/recording/start')
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER', 'TEACHER')
  @RequireEntitlement(FEATURE_KEYS.live_recording)
  async startRecording(@Param('id') id: string) {
    return this.live.startRecording(id);
  }

  @Post(':id/recording/stop')
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER', 'TEACHER')
  async stopRecording(@Param('id') id: string) {
    return this.live.stopRecording(id);
  }
}