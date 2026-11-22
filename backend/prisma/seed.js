import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { registerSchema } from '../src/schemas/auth.schema.js';

const prisma = new PrismaClient();

async function main() {
  const admin = registerSchema.safeParse({
    name: 'Administrador',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!admin.success) throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD válidos para criar o administrador.');
  const { name, email, password } = admin.data;
  const seedDemo = process.env.SEED_DEMO === 'true';
  if (seedDemo && process.env.NODE_ENV === 'production') {
    throw new Error('A conta demo não pode ser criada em produção.');
  }
  if (seedDemo && email === 'demo@fintechflow.com') {
    throw new Error('Use um endereço diferente para o administrador e a conta demo.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN') {
    throw new Error('ADMIN_EMAIL já pertence a uma conta sem perfil administrativo.');
  }
  if (!existing) {
    await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
    });
  }

  if (seedDemo) {
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
  }

  console.log(`Seed concluído. Admin: ${email}${seedDemo ? ' | Demo: demo@fintechflow.com' : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
