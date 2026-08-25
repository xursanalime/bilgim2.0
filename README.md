# Bilgim 2.0

O'qituvchilar uchun white-label **online maktab SaaS** platformasi. Har bir maktab
`slug.bilgim.uz` subdomenida yashaydi; `bilgim.uz` faqat marketing va
autentifikatsiya entrypointi.

Yagona haqiqat manbasi: [`docs/bilgim2.0.md`](docs/bilgim2.0.md).

## Monorepo tuzilishi

```text
apps/
  web/              Next.js App Router: root (bilgim.uz) + tenant (slug.bilgim.uz)
  api/              NestJS modular monolith, REST/OpenAPI + Socket.IO
packages/
  db/               Prisma schema, migrations, seeds
  domain/           shared pure domain tiplar, policyalar, Zod schemalar
  api-client/       OpenAPI-generated typed client
  ui/               accessible primitives + tema tokenlari
  i18n/             uz/ru/en xabarlari
infra/
  docker/           lokal compose stack
  terraform/        Cloudflare, R2, secrets, monitoring
  livekit/          faqat dev config; production LiveKit Cloud
```

## Talablar

- Node.js 22 (`cat .nvmrc`)
- pnpm 9 (`corepack enable`)
- Docker + Docker Compose

## Ishga tushirish

```bash
pnpm install
docker compose -f infra/docker/compose.yml up -d   # Postgres + Redis + MinIO
cp .env.example .env                               # lokal qiymatlarni to'ldiring
pnpm dev                                           # barcha app'larda dev server
```

## Asosiy buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `pnpm dev` | barcha workspace app'larida dev rejim |
| `pnpm build` | production build (Turborepo) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript strict tekshiruvi |
| `pnpm test` | unit/integration testlar |

## Qoidalar

- Tenant ma'lumotlari har doim `school_id` bilan scope qilinadi — istisno yo'q.
- Hujjatdagi qaror ustun: [docs/bilgim2.0.md](docs/bilgim2.0.md).
