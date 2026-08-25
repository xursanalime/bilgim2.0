import uz from './messages/uz.json';
import ru from './messages/ru.json';
import en from './messages/en.json';

export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uz';

/** uz fayl — barcha tillar uchun majburiy kalit shakli (source of truth). */
export type Dictionary = typeof uz;

const dictionaries: Record<Locale, Dictionary> = { uz, ru, en };

export function getDictionary(locale: string | undefined | null): Dictionary {
  if (locale && (LOCALES as readonly string[]).includes(locale)) {
    return dictionaries[locale as Locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

/** Kalit yo'q bo'lsa hech qachon crash bo'lmasin — fallback uz. */
export function translate(
  locale: string | undefined | null,
  key: keyof Dictionary['common'],
): string {
  return getDictionary(locale).common[key];
}
