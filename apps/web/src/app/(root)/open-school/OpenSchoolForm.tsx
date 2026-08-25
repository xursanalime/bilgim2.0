'use client';

import { useState } from 'react';
import { School } from 'lucide-react';
import { Button } from '@bilgim/ui';
import { openSchoolAction } from './actions';
import { normalizeSlug } from '../../../lib/slug';

export default function OpenSchoolForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slugPreview, setSlugPreview] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await openSchoolAction(formData);
    if (!result.ok) {
      setError(result.error ?? 'CREATE_SCHOOL_FAILED');
      setPending(false);
    }
    // Success — action serverda setup URL'ga redirect qiladi.
  }

  return (
    <form onSubmit={onSubmit} className="root-form" aria-busy={pending}>
      <label>
        Maktab nomi
        <input
          name="name"
          required
          maxLength={120}
          autoComplete="off"
        />
      </label>
      <label>
        Subdomen (slug)
        <input
          name="slug"
          required
          minLength={3}
          maxLength={40}
          pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
          autoComplete="off"
          onChange={(e) => setSlugPreview(normalizeSlug(e.target.value))}
        />
        {slugPreview ? <span className="root-form__hint">https://{slugPreview}.bilgim.uz</span> : null}
      </label>
      {error ? (
        <p role="alert" className="root-form__error">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} icon={<School size={16} aria-hidden="true" />}>
        Maktab ochish
      </Button>
    </form>
  );
}