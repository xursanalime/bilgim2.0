import Link from 'next/link';
import { GraduationCap, Clock, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import { apiFetch } from '../../../lib/bff';

export const metadata: Metadata = { title: 'Mening maktablarim — Bilgim' };
export const dynamic = 'force-dynamic';

/**
 * §2.2 account-level school switcher. Faqat minimal MySchoolCard summary —
 * tenant content (dars, baho, to'lov, xabar matni) uzatilmaydi.
 */
export default async function MySchoolsPage() {
  const result = await apiFetch<Array<{
    schoolId: string;
    slug: string;
    schoolName: string;
    logoUrl: string | null;
    membershipRole: string;
    nextLessonAt: string | null;
    unreadMessageCount: number;
    destinationUrl: string;
  }>>('/account/my-schools');

  if (!result.ok) {
    return (
      <main className="root-auth">
        <h1>Mening maktablarim</h1>
        <p className="root-auth__sub">Tizimga qayta kirishingiz kerak.</p>
        <Link className="root-link" href="/login">
          Kirish
        </Link>
      </main>
    );
  }

  const schools = result.data;

  return (
    <main className="root-auth root-auth--wide">
      <h1>Mening maktablarim</h1>
      <p className="root-auth__sub">Qaysi maktabingizga davom etmoqchisiz?</p>

      {schools.length === 0 ? (
        <div className="empty">
          <p>Siz hali biron maktabga qo‘shilmagansiz.</p>
          <Link className="root-link" href="/open-school">
            O‘z maktabingizni oching
          </Link>
        </div>
      ) : (
        <ul className="school-grid">
          {schools.map((school) => (
            <li key={school.schoolId}>
              <a className="school-card" href={school.destinationUrl}>
                <div className="school-card__logo">
                  {school.logoUrl ? <img src={school.logoUrl} alt="" /> : <GraduationCap size={24} />}
                </div>
                <div className="school-card__body">
                  <h2>{school.schoolName}</h2>
                  <p className="school-card__role">{school.membershipRole}</p>
                  <div className="school-card__meta">
                    {school.nextLessonAt ? (
                      <span>
                        <Clock size={14} aria-hidden="true" /> Keyingi dars mavjud
                      </span>
                    ) : null}
                    {school.unreadMessageCount > 0 ? (
                      <span>
                        <MessageSquare size={14} aria-hidden="true" /> {school.unreadMessageCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}