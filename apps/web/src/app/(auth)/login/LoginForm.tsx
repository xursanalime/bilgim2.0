'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Button } from '@bilgim/ui';
import { loginAction, type AuthResult } from '../../actions/auth';

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result: AuthResult = await loginAction(formData);
    if (!result.ok) {
      setError(result.error ?? 'LOGIN_FAILED');
      setPending(false);
      return;
    }
    // Success — loginAction serverda redirect qiladi (bu yerda bormaydi).
  }

  return (
    <form onSubmit={onSubmit} className="root-form" aria-busy={pending}>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Parol
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error ? (
        <p role="alert" className="root-form__error">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} icon={<LogIn size={16} aria-hidden="true" />}>
        Kirish
      </Button>
      <button type="button" className="root-link" onClick={() => router.push('/signup')}>
        Hisob yo‘qmi? Ro‘yxatdan o‘tish
      </button>
    </form>
  );
}