'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { normalizeSlug } from '../../../lib/slug';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

export interface OpenSchoolResult {
  ok: boolean;
  error?: string;
}

/** BFF: refresh cookie → access token → POST /v1/open-school. */
export async function openSchoolAction(formData: FormData): Promise<OpenSchoolResult> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('bilgim_refresh')?.value;
  if (!refreshToken) return { ok: false, error: 'AUTH_REQUIRED' };

  const refreshRes = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'x-refresh-token': refreshToken },
  });
  if (!refreshRes.ok) return { ok: false, error: 'SESSION_EXPIRED' };
  const { accessToken } = (await refreshRes.json()) as { accessToken?: string };
  if (!accessToken) return { ok: false, error: 'SESSION_EXPIRED' };

  const name = String(formData.get('name') ?? '');
  const slug = normalizeSlug(String(formData.get('slug') ?? ''));

  const res = await fetch(`${API_BASE}/v1/open-school`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, slug }),
  });
  const body = (await res.json().catch(() => ({}))) as { setupUrl?: string; message?: string };
  if (!res.ok) return { ok: false, error: body.message ?? 'CREATE_SCHOOL_FAILED' };

  redirect(body.setupUrl ?? 'https://bilgim.uz/my-schools');
}