import { headers } from 'next/headers';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Public API fetch (auth yo'q, §5.5). Middleware o'rnatgan tenant-slug
 * header'idan foydalanadi; root'da bo'lsa null qaytaradi.
 */
export async function tenantSlug(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get('x-bilgim-tenant-slug');
}

export interface LandingResponse {
  school: { name: string; brandJson: unknown };
  page: {
    template: string;
    hero: unknown;
    faq: unknown;
    contact: unknown;
    seo: unknown;
    publishedVersion: number;
  };
  highlights: Array<{ label: string; value: string; iconKey: string | null; position: number }>;
  successStories: Array<{
    title: string;
    body: string;
    metricLabel: string | null;
    metricValue: string | null;
    studentAlias: string;
  }>;
  testimonials: Array<{ displayName: string; body: string; courseLabel: string | null }>;
}

export async function getLanding(slug: string): Promise<LandingResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/public/schools/${slug}/landing`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as LandingResponse;
  } catch {
    return null;
  }
}

export interface CatalogCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level: string | null;
  cohorts: Array<{
    id: string;
    title: string;
    startsAt: string | null;
    capacity: number | null;
    offers: Array<{ billingModel: string; priceUzs: number; availability: string }>;
  }>;
}

export async function getCatalog(slug: string): Promise<{ school: { name: string }; courses: CatalogCourse[] } | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/public/schools/${slug}/catalog`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as { school: { name: string }; courses: CatalogCourse[] };
  } catch {
    return null;
  }
}