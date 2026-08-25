import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Maktabga qo‘shilmagansiz — Bilgim' };

export default function NoSchoolPage() {
  return (
    <main className="root-auth">
      <h1>Siz hali maktabga qo‘shilmagansiz</h1>
      <p className="root-auth__sub">
        O‘qituvchingiz sizni maktabga taklif qilganda link orqali qo‘shilishingiz mumkin. Agar
        o‘qituvchi bo‘lsangiz, o‘z maktabingizni oching.
      </p>
    </main>
  );
}