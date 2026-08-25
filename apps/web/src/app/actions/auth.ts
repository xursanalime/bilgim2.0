'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Refresh token'ni HttpOnly cookie'ga yozish — browser JS token ko'rmaydi (§5.5). */
async function setSessionCookies(refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('bilgim_refresh', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}

/** Login + §2.2 entry resolver. Access token faqat serverda; success bo'lsa
 * redirect() server-side bajariladi (NEXT_REDIRECT). */
export async function loginAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) return { ok: false, error: (body.message as string) ?? 'LOGIN_FAILED' };

  const accessToken = body.accessToken as string;
  const refreshToken = body.refreshToken as string;
  await setSessionCookies(refreshToken);

  const entry = await resolveEntry(accessToken);
  redirect(entry);
}

export async function registerAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('fullName') ?? '');

  const res = await fetch(`${API_BASE}/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, string>;
  if (!res.ok) return { ok: false, error: (body.message as string) ?? 'REGISTER_FAILED' };
  return { ok: true };
}

async function resolveEntry(accessToken: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/account/entry`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return '/my-schools';
  const decision = (await res.json()) as {
    kind: string;
    suggestedPath?: string;
    url?: string;
  };
  if (decision.kind === 'REDIRECT_TENANT' || decision.kind === 'REDIRECT_MY_SCHOOLS') {
    return decision.url ?? '/my-schools';
  }
  if (decision.kind === 'NO_MEMBERSHIP') {
    return decision.suggestedPath === '/open-school' ? '/open-school' : '/no-school';
  }
  return '/my-schools';
}