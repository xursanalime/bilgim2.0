import { GraduationCap } from 'lucide-react';
import { Button } from '@bilgim/ui';
import { getDictionary } from '@bilgim/i18n';

/**
 * Root surface placeholder (bilgim.uz).
 * To'liq marketing landing'i keyingi qadamlarda shu route ustida quriladi;
 * bu sahifa Faza 0'da "blank app deploy" exit criterionini ko'rsatadi va
 * tema tokenlari + i18n oqimini real holatda tekshirish uchun xizmat qiladi.
 */
export default function RootPage() {
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
