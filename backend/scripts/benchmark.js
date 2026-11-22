import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const size = Number(process.env.BENCH_ROWS || 10_000);
if (!Number.isSafeInteger(size) || size < 1_000 || size > 100_000) {
  throw new Error('BENCH_ROWS deve ser um inteiro entre 1.000 e 100.000.');
}

const directory = await mkdtemp(join(tmpdir(), 'fintech-flow-bench-'));
process.env.DATABASE_URL = `file:${join(directory, 'benchmark.db')}`;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const backend = fileURLToPath(new URL('../', import.meta.url));
let prisma;

async function time(label, operation) {
  for (let index = 0; index < 5; index++) await operation();
  const samples = [];
  for (let index = 0; index < 40; index++) {
    const start = performance.now();
    await operation();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const median = (samples[19] + samples[20]) / 2;
  const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
  console.log(`${label}: mediana ${median.toFixed(2)} ms · p95 ${p95.toFixed(2)} ms`);
}

try {
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: backend });
  ({ prisma } = await import('../src/lib/prisma.js'));
  const { list, monthlyReport } = await import('../src/services/transaction.service.js');
  const users = [];
  for (const name of ['Operador', 'Outra conta']) {
    users.push(await prisma.user.create({ data: {
      name, email: `${users.length}@bench.example.test`, passwordHash: 'inacessível', role: 'USER',
    } }));
  }

  for (let offset = 0; offset < size; offset += 500) {
    const data = Array.from({ length: Math.min(500, size - offset) }, (_, index) => {
      const row = offset + index;
      const createdById = users[row % 5 === 0 ? 1 : 0].id;
      return {
        createdById,
        description: `Lançamento sintético ${row}`,
        amountCents: BigInt(100 + row % 100_000),
        type: row % 3 === 0 ? 'INCOME' : 'EXPENSE',
        category: `Categoria ${row % 18}`,
        date: new Date(Date.UTC(2026, row % 12, 1 + row % 27)),
        ...(row % 17 === 0 && { deletedAt: new Date('2027-01-01'), deletedById: createdById }),
      };
    });
    await prisma.transaction.createMany({ data });
  }

  const [operator] = users;
  console.log(`${size} lançamentos sintéticos · ${process.version} · 40 amostras por operação`);
  await time('Listagem (20 itens + contagem)', () => list(operator, { page: 1, limit: 20, scope: 'mine' }));
  await time('Listagem com busca e período', () => list(operator, {
    page: 1, limit: 20, scope: 'mine', q: 'sintético 1',
    from: new Date('2026-06-01'), to: new Date('2026-08-31'),
  }));
  await time('Resumo mensal', () => monthlyReport(operator, { scope: 'mine', month: '2026-11' }));

  const plan = await prisma.$queryRaw`
    EXPLAIN QUERY PLAN
    SELECT "id" FROM "Transaction"
    WHERE "createdById" = ${operator.id} AND "deletedAt" IS NULL
    ORDER BY "date" DESC, "id" DESC LIMIT 20
  `;
  console.log('Plano de consulta representativo para a listagem:', plan.map((row) => row.detail).join(' · '));
} finally {
  await prisma?.$disconnect();
  await rm(directory, { recursive: true, force: true });
}
