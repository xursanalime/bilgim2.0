import { cookies } from 'next/headers';
import type { MySchoolCard } from '@bilgim/domain';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

/**
 * BFF server-side API call (§5.5): refresh cookie → access token (serverda),
 * so'ng API'ga bearer. Browser token'ni hech qachon ko'rmaydi.
 * Agar refresh eskirgan/revoke bo'lsa null qaytaradi (root login'ga yo'l).
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error?: string }> {
  const accessToken = await exchangeRefresh();
  if (!accessToken) return { ok: false, status: 401, error: 'SESSION_EXPIRED' };

  const res = await fetch(`${API_BASE}/v1${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, status: res.status, error: body.message };
  }
  return { ok: true, data: (await res.json()) as T };
}

/** Refresh cookie orqali access token olish. Muvaffaqiyatsiz bo'lsa null. */
async function exchangeRefresh(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('bilgim_refresh')?.value;
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'x-refresh-token': refreshToken },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { accessToken: string; refreshToken?: string };
  if (body.refreshToken) {
    cookieStore.set('bilgim_refresh', body.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  return body.accessToken ?? null;
}

export type { MySchoolCard };
