import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './config/env.provider';
import type { Env } from './config/env.provider';

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

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
