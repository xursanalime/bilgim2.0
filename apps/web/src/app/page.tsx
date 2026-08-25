import { GraduationCap } from 'lucide-react';
import { Button } from '@bilgim/ui';
import { getDictionary } from '@bilgim/i18n';
import { tenantSlug, getLanding, getCatalog } from '../lib/public';
import { TenantLanding } from '../components/tenant/TenantLanding';

export const dynamic = 'force-dynamic';

/**
 * Root/tenant routing (§2): 
 * — bilgim.uz (root host) → marketing placeholder;
 * — slug.bilgim.uz (tenant, middleware x-bilgim-tenant-slug set qiladi) →
 *   published public landing (§4.1.1). Draft/non-active landing → mismatch.
 */
export default async function RootPage() {
  const slug = await tenantSlug();
  if (slug) {
    const landing = await getLanding(slug);
    const courses = await getCatalog(slug);
    if (landing) {
      return <TenantLanding landing={landing} courses={courses} />;
    }
  }

  const t = getDictionary('uz').common;
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <GraduationCap size={32} color="var(--accent)" strokeWidth={1.75} />
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
        {t.appName}
      </h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '32rem', lineHeight: 1.6 }}>
        {t.rootPlaceholder}
      </p>
      <Button variant="secondary" size="lg" icon={<GraduationCap size={18} aria-hidden="true" />}>
        Maktab ochish (tez orada)
      </Button>
    </main>
  );
}
