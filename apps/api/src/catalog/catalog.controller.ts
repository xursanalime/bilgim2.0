import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../identity/jwt-auth.guard';
import { RbacGuard } from '../authz/rbac.guard';
import { Roles } from '../authz/roles.decorator';
import { CurrentTenantId } from '../authz/current-tenant.decorator';
import { type CatalogService } from './catalog.service';

interface LessonBody {
  sectionId?: string;
  slug: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'LIVE' | 'HYBRID';
  position?: number;
}

/**
 * Tenant catalog — `/catalog/*` signed tenant context talab (§5.5).
 * Staff (owner/teacher/assistant) CRUD; student/guest public catalog
 * `/public/schools/:slug/catalog` orqali (alohida controller).
 */
@Controller('catalog')
@UseGuards(JwtAuthGuard, RbacGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('courses')
  async list(@CurrentTenantId() schoolId: string) {
    return this.catalog.listCourses(schoolId);
  }

  @Get('courses/:idOrSlug')
  async get(@CurrentTenantId() schoolId: string, @Param('idOrSlug') idOrSlug: string) {
    return this.catalog.getCourse(schoolId, idOrSlug);
  }

  @Post('courses')
  @Roles('OWNER', 'TEACHER')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenantId() schoolId: string,
    @Body() body: { title: string; slug: string; description?: string; level?: string },
  ) {
    return this.catalog.createCourse(schoolId, body);
  }
  @Patch('courses/:id/visibility')
  @Roles('OWNER', 'TEACHER')
  async visibility(
    @CurrentTenantId() schoolId: string,
    @Param('id') id: string,
    @Body() body: { visibility: 'PUBLIC' | 'UNLISTED' | 'ARCHIVED' | 'DRAFT' },
  ) {
    return this.catalog.updateVisibility(schoolId, id, body.visibility);
  }

  @Post('courses/:id/lessons')
  @Roles('OWNER', 'TEACHER')
  @HttpCode(HttpStatus.CREATED)
  async createLesson(
    @CurrentTenantId() schoolId: string,
    @Param('id') courseId: string,
    @Body() body: LessonBody,
  ) {
    return this.catalog.createLesson(schoolId, { courseId, ...body });
  }
}