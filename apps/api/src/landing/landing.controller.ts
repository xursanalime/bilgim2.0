import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles } from '../authz/roles.decorator';
import { CurrentTenantId } from '../authz/current-tenant.decorator';
import { type LandingService, type SaveLandingInput } from './landing.service';

/**
 * Landing editor — owner-only signed tenant context (docs §4.1.1, §5.5).
 * Arbitrary HTML/JS/CSS qo'shilmaydi — structured bloklar (XSS/safe).
 */
@Controller('schools/me/landing')
@UseGuards(JwtAuthGuard, RbacGuard)
export class LandingController {
  constructor(private readonly landing: LandingService) {}

  @Get()
  @Roles('OWNER')
  async get(@CurrentTenantId() schoolId: string) {
    return this.landing.get(schoolId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER')
  async save(@CurrentTenantId() schoolId: string, @Body() body: SaveLandingInput) {
    return this.landing.save(schoolId, body);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER')
  async publish(@CurrentTenantId() schoolId: string) {
    return this.landing.publish(schoolId);
  }

  @Post('highlights')
  @HttpCode(HttpStatus.CREATED)
  @Roles('OWNER')
  async addHighlight(
    @CurrentTenantId() schoolId: string,
    @Body() body: { label: string; value: string; iconKey?: string; position?: number },
  ) {
    return this.landing.addHighlight(schoolId, body);
  }
}