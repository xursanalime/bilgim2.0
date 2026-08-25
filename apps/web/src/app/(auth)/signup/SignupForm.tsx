'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@bilgim/ui';
import { registerAction, type AuthResult } from '../../actions/auth';

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result: AuthResult = await registerAction(formData);
    if (!result.ok) {
      setError(result.error ?? 'REGISTER_FAILED');
      setPending(false);
      return;
    }
    router.push('/login');
  }

  return (
    <form onSubmit={onSubmit} className="root-form" aria-busy={pending}>
      <label>
        Ism
        <input name="fullName" required autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Parol
        <input name="password" type="password" minLength={8} required autoComplete="new-password" />
      </label>
      {error ? (
        <p role="alert" className="root-form__error">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} icon={<UserPlus size={16} aria-hidden="true" />}>
        Ro‘yxatdan o‘tish
      </Button>
      <button type="button" className="root-link" onClick={() => router.push('/login')}>
        Hisobingiz bormi? Kirish
      </button>
    </form>
  );
}