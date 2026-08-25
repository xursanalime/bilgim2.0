import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SchoolMemberRole } from '@bilgim/domain';
import type { Request } from 'express';

/** RBAC metadata key — RbacGuard unda Reflector bilan o'qiydi. */
export const RBAC_ROLES_KEY = 'bilgim:rbac-roles';

/**
 * Controller/handler darajasida ruxsat etilgan SchoolMember rollarini
 * belgilaydi. Bo'sh bo'lsa — har qanday active member (tenant scope'da).
 * Foydalanish: `@Roles('OWNER', 'TEACHER')`.
 */
export function Roles(...roles: SchoolMemberRole[]) {
  return SetMetadata(RBAC_ROLES_KEY, roles);
}

/**
 * Current membership — RbacGuard o'tganidan keyin request.membership.
 * Foydalanish: `@CurrentMembership() m: MembershipInfo`.
 */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.membership;
  },
);