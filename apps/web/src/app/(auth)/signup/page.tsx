import type { Metadata } from 'next';
import SignupForm from './SignupForm';

export const metadata: Metadata = { title: "Ro'yxatdan o'tish — Bilgim" };

export default function SignupPage() {
  return (
    <main className="root-auth">
      <h1>Hisob yaratish</h1>
      <p className="root-auth__sub">O'z maktabingizni ochish yoki o'qishni boshlash.</p>
      <SignupForm />
    </main>
  );
}