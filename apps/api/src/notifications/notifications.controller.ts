import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { type NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.notifications.list(user.userId, Number(limit ?? 20));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.userId, id);
  }

  @Post('telegram/link')
  @HttpCode(HttpStatus.OK)
  async linkTelegram(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { telegramChatId: string },
  ) {
    return this.notifications.linkTelegram(user.userId, body.telegramChatId);
  }
}