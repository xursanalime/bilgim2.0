import type { Env } from '../config/env.provider';

/**
 * Sentry error tracking bazasi (§9).
 * SENTRY_DSN berilmagan bo'lsa o'chirilgan bo'ladi — lokal dev'da DSN yo'q.
 * beforeSend'da sensitive qiymatlar scrub qilinadi; to'liq redaction policy
 * keyingi fazalarda kengaytiriladi.
 */
export function setupSentry(env: Env): void {
  if (!env.SENTRY_DSN) {
    return;
  }

  // Dynamic import — DSN bo'lmasa paket yuklanmaydi
  void import('@sentry/nestjs').then((Sentry) => {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      sendDefaultPii: false,
      beforeSend(event) {
        // Parol/token kabi maydonlarni hech qachon yubormaslik (§9)
        if (event.request?.data && typeof event.request.data === 'object') {
          const data = { ...event.request.data } as Record<string, unknown>;
          for (const key of Object.keys(data)) {
            if (/password|token|secret|authorization/i.test(key)) {
              data[key] = '[REDACTED]';
            }
          }
          event.request.data = data;
        }
        return event;
      },
    });
  });
}
