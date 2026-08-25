import {
  SetMetadata,
  Injectable,
  type CanActivate,
  type ExecutionContext,
  applyDecorators,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { type EntitlementService } from '../billing/entitlement.service';
import type { FeatureKey } from '../billing/entitlement.service';

export const REQUIRED_FEATURE = 'bilgim:required-feature';

/**
 * Entitlement guard — §4.5 zanjirning qadam 4. Ui hidden-state bu
 * guardni chetlab o'tolmaydi. Feature snapshotda enabled bo'lmasa
 * `PLAN_FEATURE_NOT_INCLUDED` (403). `@RequireEntitlement('live.recording')`.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<FeatureKey | undefined>(
      REQUIRED_FEATURE,
      context.getHandler(),
    );
    if (!feature) return true;

    const schoolId = context.switchToHttp().getRequest<Request>().tenantContext?.schoolId;
    if (!schoolId) throw new ForbiddenException('TENANT_CONTEXT_MISSING');

    await this.entitlement.requireFeature(schoolId, feature);
    return true;
  }
}

export function RequireEntitlement(feature: FeatureKey) {
  return applyDecorators(
    SetMetadata(REQUIRED_FEATURE, feature),
    UseGuards(EntitlementGuard),
  );
}