import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

/**
 * Lokal dev seed — authenticated test user (Faza 0 exit criterion).
 * Bu faqat development uchun; production'da seed bajarilmaydi.
 */
const prisma = new PrismaClient();

const TEST_EMAIL = 'test@bilgim.uz';

async function main(): Promise<void> {
  const password = process.env.SEED_TEST_PASSWORD ?? 'BilgimTest2026!';
  const passwordHash = await hash(password);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: {
      email: TEST_EMAIL,
      passwordHash,
      fullName: 'Test Foydalanuvchi',
      locale: 'uz',
      status: 'ACTIVE',
    },
  });

  console.warn(`✅ Test user tayyor (id=${user.id}, email=${TEST_EMAIL})`);
  console.warn('   Parolni o‘zgartirish uchun: SEED_TEST_PASSWORD=<parol> pnpm --filter @bilgim/db db:seed');
}

main()
  .catch((error) => {
    console.error('Seed xato:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
