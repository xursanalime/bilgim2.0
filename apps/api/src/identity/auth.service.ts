import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';
import { prisma } from '@bilgim/db';
import { ENV } from '../config/env.provider';
import type { Env } from '../config/env.provider';
import { type CryptoService } from './crypto.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRotation extends AuthTokens {
  /** true — oldingi refresh tokenda reuse aniqlandi (xavfsizlik hodisasi, §9) */
  reuseDetected: boolean;
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun
const ACCESS_TTL_S = 15 * 60; // 15 daqiqa

/**
 * Global autentifikatsiya: registration, login va session rotation.
 * — parol: @node-rs/argon2 (Argon2id, §9);
 * — refresh token: tasodifiy, shifrlangan va hashValue bilan DB'da saqlanadi;
 * — har refresh'da oldingi sessiya revoke qilinadi (rotation/reuse detection).
 * RBAC (SchoolMember) authorization bilan Faza 1'da to'liq bog'lanadi.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
  ) {}

  async register(input: { email: string; password: string; fullName: string }) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('ACCOUNT_ALREADY_EXISTS');

    const passwordHash = await hash(input.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName: input.fullName, status: 'PENDING_VERIFICATION' },
      select: { id: true },
    });
    return { userId: user.id, requiresEmailVerification: true };
  }

  async login(input: { email: string; password: string }): Promise<AuthTokens> {
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    const ok = await verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS');

    return this.issueTokens(user.id);
  }

  async refresh(refreshToken: string): Promise<RefreshRotation> {
    const tokenHash = this.crypto.hashValue(refreshToken);
    const session = await prisma.session.findUnique({ where: { refreshTokenHash: tokenHash } });
    if (!session) throw new UnauthorizedException('SESSION_INVALID');

    const now = new Date();
    if (session.revokedAt) {
      // Reuse signali — bu session allaqachon revoke qilingan. Umumiy oldini
      // olish uchun userning hamma sessiyalarini bekor qilamiz (§9).
      await prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('SESSION_REUSE_DETECTED');
    }
    if (session.expiresAt < now) throw new UnauthorizedException('SESSION_EXPIRED');

    // Rotation: old sessiyani revoke qilamiz va yangi refresh chiqaramiz.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } });
    const tokens = await this.issueTokens(session.userId);
    return { ...tokens, reuseDetected: false };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.crypto.hashValue(refreshToken);
    await prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessSecret = this.env.AUTH_ACCESS_SECRET ?? '';
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { secret: accessSecret, expiresIn: `${ACCESS_TTL_S}s` },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.crypto.hashValue(refreshToken);

    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash: tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}