import type { MembershipInfo } from '../authz/rbac.guard';
import type { AuthenticatedUser } from '../identity/jwt-auth.guard';

/**
 * Express Request kengaytmasi — butun API'da yagona augmentation.
 * (Per-file augmentations xato qiladi — shuning uchun bitta joyda.)
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      membership?: MembershipInfo;
      /** BFF signed header orqali o'rnatilgan tenant context (§5.2). */
      tenantContext?: { schoolId: string; slug: string; requestId: string } | null;
    }
  }
}

export {};