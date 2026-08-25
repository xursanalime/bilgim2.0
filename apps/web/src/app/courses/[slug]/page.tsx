import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { getCatalog, tenantSlug, type CatalogCourse } from '../../../lib/public';

export const dynamic = 'force-dynamic';

/**
 * Tenant course vitrina sahifasi (§4.1.1, §2.2). Faqat PUBLIC course —
 * draft/private course yoki enrolled student ma'lumoti chiqmaydi.
 */
export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantSlug();
  if (!tenant) notFound();

  const catalog = await getCatalog(tenant);
  const course = catalog?.courses.find((c: CatalogCourse) => c.slug === slug);
  if (!course) notFound();

  const cohort = course.cohorts[0];

  return (
    <main className="tenant-landing">
      <Link href="/" className="tenant-back">
        <ArrowLeft size={16} aria-hidden="true" /> Kurslarga qaytish
      </Link>

      <section className="tenant-course-detail">
        <h1>{course.title}</h1>
        {course.description ? <p className="tenant-course-detail__desc">{course.description}</p> : null}
        {course.level ? <span className="tenant-badge">{course.level}</span> : null}

        {cohort ? (
          <div className="tenant-cohort-card">
            <h2>{cohort.title}</h2>
            <div className="tenant-course__meta">
              <span>
                <CalendarDays size={14} aria-hidden="true" />
                {cohort.startsAt
                  ? `Boshlanish: ${new Date(cohort.startsAt).toLocaleDateString('uz')}`
                  : 'Yaqinda'}
              </span>
              <span className="tenant-price">
                {cohort.offers[0]?.billingModel === 'FREE'
                  ? 'Bepul'
                  : `${(cohort.offers[0]?.priceUzs ?? 0).toLocaleString('uz-UZ')} so‘m`}
              </span>
            </div>
            <a className="tenant-btn tenant-btn--primary" href={`/signup?intent=${encodeURIComponent(cohort.id)}`}>
              Kursga qo‘shilish
            </a>
          </div>
        ) : (
          <p>Hozircha ochiq guruh yo‘q.</p>
        )}
      </section>
    </main>
  );
}