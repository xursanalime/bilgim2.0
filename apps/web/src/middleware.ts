import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_HOSTS = new Set([
  'www',
  'api',
  'admin',
  'media',
  'assets',
  'mail',
  'docs',
  'status',
  'support',
  'app',
  'cdn',
  'staging',
  'dev',
  'test',
]);

/** Xostdan tenant slug kandidatini ajratadi (faqat bitta first label). */
export function extractSlug(host: string): string | null {
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  const labels = hostname.split('.');
  if (labels.length >= 3 && hostname.endsWith('bilgim.uz')) {
    const first = labels[0];
    if (first && first !== 'www' && !RESERVED_HOSTS.has(first)) return first;
  }
  return null;
}

const ROOT_HOSTS = new Set(['bilgim.uz', 'www.bilgim.uz', 'localhost', '127.0.0.1']);

/**
 * Tenant routing middleware (§5.2).
 * — root surface (bilgim.uz/www/localhost) → root app davom etadi;
 * — aks holda birinchi label tenant slug kandidatidir. `x-bilgim-tenant-slug`
 *   header'i BFF API call uchun server-side qo'shiladi; internetdan kelgan
 *   `x-bilgim-tenant-*` nusxalari strip qilinadi (§5.2).
 * Resolve qilinmagan/non-active slug → tenant app ichida 404 (silent
 * redirect yo'q, §5.2).
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const isRoot = ROOT_HOSTS.has(host.replace(/:\d+$/, '').toLowerCase());

  const response = isRoot ? NextResponse.next() : tenantResponse(host);
  stripTenantHeaders(response);
  return response;
}

function tenantResponse(host: string): NextResponse {
  const slug = extractSlug(host);
  const response = NextResponse.next();
  if (slug) {
    response.headers.set('x-bilgim-tenant-slug', slug);
    // Faza 1: faqat slug header — tenant id resolve Faza 1'da BFF orqali.
  }
  return response;
}

/** Internetdan kelgan internal header nusxalarini tozalaydi (§5.2). */
function stripTenantHeaders(response: NextResponse): void {
  for (const h of ['x-bilgim-tenant-id', 'x-bilgim-tenant-slug', 'x-bilgim-request-id']) {
    response.headers.delete(h);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};