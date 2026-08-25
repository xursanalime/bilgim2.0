import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../identity/jwt-auth.guard';
import { CurrentUser } from '../identity/current-user.decorator';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles, CurrentMembership } from '../authz/roles.decorator';
import { type SchoolsService } from './schools.service';

interface CreateSchoolBody {
  slug: string;
  name: string;
  timezone?: string;
}

interface UpdateBrandBody {
  name?: string;
  logoUrl?: string;
  headline?: string;
}

/**
 * School provisioning + brand. `/v1/schools/me/*` — tenant signed context
 * talab qiladi (§5.5). Yakuniy Microscope: owner/assistant billq-ish huquqi
 * RbacGuard orqali tekshiriladi.
 */
@Controller('schools')
@UseGuards(JwtAuthGuard)
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Get('me')
  @UseGuards(RbacGuard)
  async getMySchool(@CurrentMembership() membership: { schoolId: string }) {
    const school = await this.schools.findByTenant(membership.schoolId);
    return school;
  }

  @Patch('me/brand')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RbacGuard)
  @Roles('OWNER', 'ASSISTANT')
  async updateBrand(
    @CurrentMembership() membership: { schoolId: string },
    @Body() body: UpdateBrandBody,
  ) {
    return this.schools.updateBrand(membership.schoolId, body);
  }
}

/**
 * Owner-only provisioning — `/v1/open-school` root surface'dan chaqiriladi
 * (§2.2: teacher yangi maktab ochish). Tenant context shart emas.
 */
@Controller('open-school')
export class OpenSchoolController {
  constructor(private readonly schools: SchoolsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createSchool(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateSchoolBody) {
    return this.schools.createSchool({ ownerUserId: user.userId, ...body });
  }
}