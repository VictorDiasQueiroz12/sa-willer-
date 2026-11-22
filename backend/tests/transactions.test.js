import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

let directory;
let prisma;
let server;
let base;
let user;
let outsider;
let admin;

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  });
  return { status: response.status, data: response.status === 204 ? null : await response.json() };
}

const credentials = (name) => ({ email: `${name}@example.test`, password: 'Teste@12345' });

async function register(name) {
  const result = await request('POST', '/auth/register', { body: { name, ...credentials(name) } });
  assert.equal(result.status, 201);
  return result.data;
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'fintech-flow-test-'));
  process.env.DATABASE_URL = `file:${join(directory, 'suite.db')}`;
  process.env.JWT_SECRET = 'Segredo-temporario-usado-apenas-na-suite-de-testes';
  const backend = fileURLToPath(new URL('../', import.meta.url));
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { cwd: backend });

  ({ prisma } = await import('../src/lib/prisma.js'));
  const { app } = await import('../src/app.js');
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api`;
  user = await register('operador');
  outsider = await register('outro');
  const adminAccount = await register('administrador');
  await prisma.user.update({ where: { id: adminAccount.user.id }, data: { role: 'ADMIN' } });
  const result = await request('POST', '/auth/login', { body: credentials('administrador') });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.role, 'ADMIN');
  admin = result.data;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  if (directory) await rm(directory, { recursive: true, force: true });
});

const entry = { description: 'Pagamento de aluguel', amount: '2000,01', type: 'EXPENSE', date: '2026-02-28' };
const transactions = '/transactions';

test('valida valor absoluto, data real e ordem cronológica dos filtros', async () => {
  assert.equal((await request('GET', transactions)).status, 401);
  for (const patch of [{ amount: '-1' }, { amount: '1,001' }, { date: null }, { date: '2026-02-29' }]) {
    const result = await request('POST', transactions, { token: user.token, body: { ...entry, ...patch } });
    assert.equal(result.status, 400);
    assert.equal(result.data.error, 'Dados inválidos');
  }
  const invalid = await request('GET', `${transactions}?from=2026-03-01&to=2026-02-28`, user);
  assert.equal(invalid.status, 400);
});

test('preserva centavos, isola usuários e audita CRUD, exclusão e restauração', async () => {
  const created = await request('POST', transactions, { ...user, body: entry });
  assert.equal(created.status, 201);
  const { id } = created.data;
  const path = `${transactions}/${id}`;
  assert.equal(created.data.amountCents, '200001');
  assert.equal(created.data.date, '2026-02-28T00:00:00.000Z');

  assert.equal((await request('GET', path, outsider)).status, 404);
  assert.equal((await request('PUT', path, { ...outsider, body: entry })).status, 404);
  assert.equal((await request('DELETE', path, outsider)).status, 404);
  assert.equal((await request('GET', '/admin/audit', user)).status, 403);
  assert.deepEqual((await request('GET', `${transactions}/balance`, outsider)).data, {
    incomeCents: '0', expenseCents: '0', balanceCents: '0', currency: 'BRL', scope: 'mine',
  });

  const dateQuery = `${transactions}?from=2026-02-28&to=2026-02-28&type=EXPENSE`;
  assert.deepEqual((await request('GET', dateQuery, user)).data.items.map((item) => item.id), [id]);
  assert.equal((await request('GET', `${transactions}?from=2026-03-01`, user)).data.total, 0);
  assert.equal((await request('GET', `${transactions}/balance`, user)).data.balanceCents, '-200001');
  assert.equal((await request('GET', `${transactions}/balance?scope=all`, admin)).data.balanceCents, '-200001');
  assert.equal((await request('GET', `${transactions}/balance?scope=mine`, admin)).data.balanceCents, '0');

  const updatedBody = { ...entry, amount: '1999.99', category: 'Infraestrutura' };
  const updated = await request('PUT', path, { ...admin, body: updatedBody });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.updatedById, admin.user.id);
  assert.equal((await request('GET', `${transactions}/balance`, user)).data.balanceCents, '-199999');

  assert.equal((await request('DELETE', path, user)).status, 204);
  assert.equal((await request('GET', path, user)).status, 404);
  assert.equal((await request('GET', `${transactions}?includeDeleted=true`, user)).data.total, 0);
  const hidden = (await request('GET', `${transactions}?includeDeleted=true`, admin)).data.items[0];
  assert.ok(hidden.deletedAt);
  assert.equal(hidden.deletedById, user.user.id);
  assert.equal((await request('GET', `${transactions}/balance`, user)).data.balanceCents, '0');
  assert.equal((await request('POST', `${path}/restore`, user)).status, 403);

  const replacement = await request('POST', transactions, { ...user, body: updatedBody });
  assert.equal(replacement.status, 201);
  assert.equal((await request('POST', `${path}/restore`, admin)).status, 409);
  assert.equal((await request('DELETE', `${transactions}/${replacement.data.id}`, user)).status, 204);
  assert.equal((await request('POST', `${path}/restore`, admin)).status, 200);
  assert.equal((await request('GET', `${transactions}/balance`, user)).data.balanceCents, '-199999');

  const audit = (await request('GET', `/admin/audit?transactionId=${id}`, admin)).data.items.reverse();
  assert.deepEqual(audit.map((log) => log.action), ['CREATE', 'UPDATE', 'DELETE', 'RESTORE']);
  assert.deepEqual(audit.map((log) => log.userId), [user.user.id, admin.user.id, user.user.id, admin.user.id]);
  assert.equal(audit[1].before.amountCents, '200001');
  assert.equal(audit[1].after.amountCents, '199999');
  assert.ok(audit[2].after.deletedAt);
  assert.equal(audit[3].after.deletedAt, null);

  await assert.rejects(prisma.$executeRaw`UPDATE "Transaction" SET "amountCents" = -1 WHERE id = ${id}`);
  await assert.rejects(prisma.$executeRaw`DELETE FROM "Transaction" WHERE id = ${id}`);
  await assert.rejects(prisma.$executeRaw`UPDATE "AuditLog" SET action = 'CREATE' WHERE id = ${audit[0].id}`);
  await assert.rejects(prisma.$executeRaw`DELETE FROM "AuditLog" WHERE id = ${audit[0].id}`);
});

test('grava apenas uma cópia concorrente e não audita edição rejeitada', async () => {
  const body = { ...entry, description: 'Recebimento concorrente', type: 'INCOME', amount: '0,01' };
  const responses = await Promise.all(
    Array.from({ length: 3 }, () => request('POST', transactions, { ...user, body })),
  );
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409, 409]);
  const winner = responses.find((response) => response.status === 201).data;
  const separate = await request('POST', transactions, { ...user, body: { ...body, amount: '0,02' } });
  assert.equal(separate.status, 201);
  assert.equal((await request('PUT', `${transactions}/${separate.data.id}`, { ...user, body })).status, 409);
  assert.equal((await request('GET', `${transactions}/balance`, user)).data.incomeCents, '3');
  for (const id of [winner.id, separate.data.id]) {
    assert.deepEqual((await request('GET', `/admin/audit?transactionId=${id}`, admin)).data.items
      .map((log) => log.action), ['CREATE']);
  }
});
