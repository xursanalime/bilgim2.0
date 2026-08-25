import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { type AuthService } from './auth.service';
import type { Request } from 'express';

interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

interface LoginDto {
  email: string;
  password: string;
}

// Minimal DTO validatsiya — Zod/class-validator Faza 1'da kirish TC'ga bog'lanadi.
// Bu yerda asosiy maydonlar bo'sh bo'lmagan bo'lishi, email shakli tekshiriladi.
function assertNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) {
    throw new UnauthorizedException(`VALIDATION_${field.toUpperCase()}_REQUIRED`);
  }
  return value.trim();
}

function assertValidEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UnauthorizedException('VALIDATION_EMAIL_INVALID');
  }
  return email;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    const email = assertValidEmail(body.email);
    const password = assertNonEmpty(body.password, 'password');
    const fullName = assertNonEmpty(body.fullName, 'fullName');
    return this.auth.register({ email, password, fullName });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    const email = assertValidEmail(body.email);
    const password = assertNonEmpty(body.password, 'password');
    return this.auth.login({ email, password });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request) {
    const token = extractRefreshToken(request);
    return this.auth.refresh(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: Request) {
    const token = extractRefreshToken(request);
    await this.auth.logout(token);
    return { ok: true };
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}

function extractRefreshToken(request: Request): string {
  const header = (request.headers as Record<string, string | string[] | undefined>)['x-refresh-token'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) throw new UnauthorizedException('REFRESH_TOKEN_MISSING');
  return value;
}