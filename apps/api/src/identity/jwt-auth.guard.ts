import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { prisma } from '@bilgim/db';
import { ENV } from '../config/env.provider';
import type { Env } from '../config/env.provider';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/**
 * Access-token JWT guard. Token'dagi `sub` (userId) orqali active userni
 * tekshiradi; account inactive bo'lsa rad etadi (§5.3). RBAC authorization
 * SchoolMember bo'yicha keyingi qatlamda; bu yerda faqat authentication.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env, private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(request);
    if (!token) throw new UnauthorizedException('AUTH_TOKEN_MISSING');

    let payload: { sub?: string; email?: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.env.AUTH_ACCESS_SECRET ?? '',
      });
    } catch {
      throw new UnauthorizedException('AUTH_TOKEN_INVALID');
    }
    if (!payload.sub) throw new UnauthorizedException('AUTH_TOKEN_INVALID');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true },
    });
    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('ACCOUNT_INACTIVE');
    }

    const currentUser: AuthenticatedUser = { userId: user.id, email: user.email };
    (request as Request & { user?: AuthenticatedUser }).user = currentUser;
    return true;
  }
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}