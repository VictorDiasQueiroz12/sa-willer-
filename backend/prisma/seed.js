import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@fintechflow.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@fintechflow.com' },
    update: {},
    create: {
      name: 'Usuário Demo',
      email: 'demo@fintechflow.com',
      passwordHash: await bcrypt.hash('Demo@12345', 12),
      role: 'USER',
    },
  });

  console.log(`Seed concluído. Admin: ${adminEmail} | Demo: demo@fintechflow.com`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
