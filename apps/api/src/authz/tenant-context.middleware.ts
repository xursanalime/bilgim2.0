import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export const TENANT_HEADERS = {
  id: 'x-bilgim-tenant-id',
  slug: 'x-bilgim-tenant-slug',
  requestId: 'x-bilgim-request-id',
} as const;

/**
 * Tenant context middleware. BFF (Next.js) server-side o'z internal signed
 * request'lariga `x-bilgim-tenant-*` header qo'shadi (§5.2). Internetdan
 * kelgan header nusxasi ishonchli emas — web middleware/native proxy o'zi
 * strip qilishi Lardan (§5.2). Bu qatlam request.tenantContext ni o'rnatadi;
 * RbacGuard va tenant repo shunday scope ishlaydi.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const id = request.get(TENANT_HEADERS.id);
    const slug = request.get(TENANT_HEADERS.slug);
    if (id && slug) {
      request.tenantContext = {
        schoolId: id,
        slug,
        requestId: request.get(TENANT_HEADERS.requestId) ?? randomUUID(),
      };
    }
    next();
  }
}