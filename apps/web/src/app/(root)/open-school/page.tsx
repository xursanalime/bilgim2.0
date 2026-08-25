import type { Metadata } from 'next';
import OpenSchoolForm from './OpenSchoolForm';

export const metadata: Metadata = { title: 'Maktab ochish — Bilgim' };

export default function OpenSchoolPage() {
  return (
    <main className="root-auth">
      <h1>Maktabingizni oching</h1>
      <p className="root-auth__sub">
        Nom va subdomeningizni tanlang — bir necha daqiqada online maktabingiz tayyor.
      </p>
      <OpenSchoolForm />
    </main>
  );
}