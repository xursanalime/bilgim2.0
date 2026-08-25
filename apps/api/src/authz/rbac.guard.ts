import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { prisma } from '@bilgim/db';
import type { SchoolMemberRole } from '@bilgim/domain';
import { RBAC_ROLES_KEY } from './roles.decorator';

export interface MembershipInfo {
  schoolId: string;
  role: SchoolMemberRole;
  status: string;
}

/**
 * RBAC guard — tenant scope'dagi authorization (§5.3).
 * JwtAuthGuard oldin ishlaydi (user aniqlanadi). Bu guard current userning
 * active SchoolMember roli tekshiradi. Tenant context query/body'dan emas,
 * doim BFF signed header / DI orqali keladi; internetdan kelgan
 * `x-bilgim-tenant-id` nusxasi middleware strip qiladi (§5.2).
 * `@Roles()` metadata bo'lmasa — har qanday ACTIVE member.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('AUTH_REQUIRED');

    const tenantId = request.tenantContext?.schoolId;
    if (!tenantId) throw new ForbiddenException('TENANT_CONTEXT_MISSING');

    const member = await prisma.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId: tenantId, userId: user.userId } },
      select: { role: true, status: true },
    });
    if (!member) throw new ForbiddenException('NOT_A_MEMBER');
    if (member.status === 'SUSPENDED') throw new ForbiddenException('MEMBER_SUSPENDED');

    const allowedRoles = this.reflector.getAllAndOverride<SchoolMemberRole[] | undefined>(
      RBAC_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
      throw new ForbiddenException('INSUFFICIENT_ROLE');
    }

    request.membership = { schoolId: tenantId, role: member.role, status: member.status };
    return true;
  }
}