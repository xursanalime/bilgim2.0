import Link from 'next/link';
import { GraduationCap, Users, CalendarDays } from 'lucide-react';
import type { LandingResponse, CatalogCourse } from '../../lib/public';

/**
 * Tenant public landing (§4.1.1, §8.1.1). Editorial layout — dashboard
 * emas; brand tokenlari va structured bloklar. Faqat published + consent
 * content server tomonidan berilgan.
 */
export function TenantLanding({
  landing,
  courses,
}: {
  landing: LandingResponse;
  courses: { school: { name: string }; courses: CatalogCourse[] } | null;
}) {
  const hero = (landing.page.hero as { headline?: string; subheadline?: string } | null) ?? {};

  return (
    <main className="tenant-landing">
      <header className="tenant-header">
        <div className="tenant-header__brand">
          <GraduationCap size={20} aria-hidden="true" />
          <strong>{landing.school.name}</strong>
        </div>
        <nav className="tenant-header__nav" aria-label="Asosiy">
          <a href="#courses">Kurslar</a>
          <a href="#about">O‘qituvchi</a>
          <a href="#testimonials">Fikrlar</a>
          <Link className="tenant-btn" href={`/signup`}>
            Ro‘yxatdan o‘tish
          </Link>
        </nav>
      </header>

      <section className="tenant-hero">
        <h1>{hero.headline ?? `${landing.school.name} — Ingliz tili maktabi`}</h1>
        <p>{hero.subheadline ?? 'Kurslaringizni tanlang va o‘rganishni boshlang.'}</p>
        <div className="tenant-hero__actions">
          <a className="tenant-btn tenant-btn--primary" href="#courses">
            Kurslarni ko‘rish
          </a>
          <Link className="tenant-btn" href="/signup">
            Ro‘yxatdan o‘tish
          </Link>
        </div>
      </section>

      {landing.highlights.length > 0 ? (
        <section className="tenant-stats" aria-label="Ishonch ko‘rsatkichlari">
          {landing.highlights.map((h) => (
            <div key={`${h.label}-${h.value}`} className="tenant-stat">
              <Users size={16} aria-hidden="true" />
              <strong>{h.value}</strong>
              <span>{h.label}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section id="courses" className="tenant-section">
        <h2>Kurslar</h2>
        <div className="tenant-courses">
          {(courses?.courses ?? []).map((course) => (
            <Link
              key={course.id}
              className="tenant-course"
              href={`/courses/${course.slug}`}
            >
              <h3>{course.title}</h3>
              {course.description ? <p>{course.description}</p> : null}
              <div className="tenant-course__meta">
                {course.cohorts[0] ? (
                  <>
                    <span>
                      <CalendarDays size={14} aria-hidden="true" />
                      {course.cohorts[0].startsAt
                        ? `Boshlanish: ${new Date(course.cohorts[0].startsAt).toLocaleDateString('uz')}`
                        : 'Yaqinda'}
                    </span>
                    <span className="tenant-price">
                      {course.cohorts[0].offers[0]?.billingModel === 'FREE'
                        ? 'Bepul'
                        : `${(course.cohorts[0].offers[0]?.priceUzs ?? 0).toLocaleString('uz-UZ')} so‘m`}
                    </span>
                  </>
                ) : (
                  <span>Ma'lumot tez orada</span>
                )}
              </div>
            </Link>
          ))}
          {courses?.courses.length === 0 ? <p>Hozircha ochiq kurslar yo‘q.</p> : null}
        </div>
      </section>

      <section id="testimonials" className="tenant-section">
        <h2>O‘quvchilar fikrlari</h2>
        <div className="tenant-testimonials">
          {landing.testimonials.map((t) => (
            <blockquote key={t.displayName} className="tenant-testimonial">
              <p>“{t.body}”</p>
              <footer>
                — {t.displayName}
                {t.courseLabel ? `, ${t.courseLabel}` : ''}
              </footer>
            </blockquote>
          ))}
          {landing.testimonials.length === 0 ? <p>Fikrlar hali qo‘shilmagan.</p> : null}
        </div>
      </section>

      <footer className="tenant-footer">
        <p>© {new Date().getFullYear()} {landing.school.name}</p>
      </footer>
    </main>
  );
}