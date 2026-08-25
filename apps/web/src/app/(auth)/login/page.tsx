import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Kirish — Bilgim' };

export default function LoginPage() {
  return (
    <main className="root-auth">
      <h1>Bilgim'ga kirish</h1>
      <p className="root-auth__sub">Maktabingizga davom etish uchun tizimga kiring.</p>
      <LoginForm />
    </main>
  );
}