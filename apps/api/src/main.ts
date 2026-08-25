import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './config/env.provider';
import type { Env } from './config/env.provider';
import { setupTracing } from './observability/otel';
import { setupSentry } from './observability/sentry';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global REST prefix — production'da https://api.bilgim.uz/v1 (§5.5)
  app.setGlobalPrefix('v1');

  // Strict CORS: faqat ma'lum surface hostlar. Tenant wildcardlari
  // Faza 1'da host resolver bilan kengaytiriladi.
  const env = app.get<Env>(ENV);
  app.enableCors({
    origin: [env.WEB_URL],
    credentials: true,
  });

  // Observability — DSN/endpoint berilmagan bo'lsa no-op (lokal dev'da
  // zero-overhead; production'da env majburiy beriladi)
  const shutdownTracing = await setupTracing(env);
  setupSentry(env);

  app.enableShutdownHooks();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void shutdownTracing?.();
    });
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
