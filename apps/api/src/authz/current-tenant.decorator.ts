import { createParamDecorator, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * TenantContext'dan schoolId — RbacGuard o'tganidan keyin mavjud.
 * Query/body'dan schoolId qabul qilinmaydi (§5.2); faqat signed context.
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantId = request.tenantContext?.schoolId;
    if (!tenantId) throw new ForbiddenException('TENANT_CONTEXT_MISSING');
    return tenantId;
  },
);