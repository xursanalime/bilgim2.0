import { z } from 'zod';

/**
 * Server muhitining yagona Zod schemasi.
 * Qoida: secret'lar repoga yoki logga yozilmaydi (docs/bilgim2.0.md §9).
 * Production'da dev-default secret bilan ishga tushish taqiqlangan — fail-closed.
 */

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    { message: 'DATABASE_URL postgresql:// yoki postgres:// bilan boshlanishi kerak' },
  );

const httpUrl = z.string().url();

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Data layer
  DATABASE_URL: postgresUrl,
  REDIS_URL: httpUrl.default('redis://localhost:6379'),

  // Surface URLlar
  WEB_URL: httpUrl.default('http://localhost:3000'),
  API_URL: httpUrl.default('http://localhost:4000'),

  // Auth — production'da majburiy, kuchli random qiymat bo'lishi shart
  AUTH_ACCESS_SECRET: z.string().min(32).optional(),
  AUTH_REFRESH_SECRET: z.string().min(32).optional(),

  // Cloudflare R2 (S3-mos). Lokal dev'da MinIO ishlatiladi — R2_ENDPOINT beriladi.
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).default('bilgim-local'),
  R2_ENDPOINT: httpUrl.optional(),

  // Observability — bo'sh bo'lsa instrumentation o'chirilgan bo'ladi
  SENTRY_DSN: httpUrl.optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: httpUrl.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const DEV_ONLY_SECRET_VALUES = new Set(['dev-only-insecure-secret-change-me']);

function formatIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
}

/**
 * Muhitni parse qiladi va validatsiyadan o'tmagan jarayonni darhol to'xtatadi.
 */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Server muhit validatsiyadan o'tmadi:\n${formatIssues(parsed.error)}`);
  }

  if (parsed.data.NODE_ENV === 'production') {
    for (const key of ['AUTH_ACCESS_SECRET', 'AUTH_REFRESH_SECRET'] as const) {
      const value = parsed.data[key];
      if (!value || DEV_ONLY_SECRET_VALUES.has(value)) {
        throw new Error(
          `Production muhitda ${key} majburiy va dev-default qiymat taqiqlangan.`,
        );
      }
    }
  }

  return parsed.data;
}
