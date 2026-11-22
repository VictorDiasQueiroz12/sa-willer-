import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { admin } from './accounts.js';

const directory = await mkdtemp(join(tmpdir(), 'fintech-flow-e2e-'));
const backend = fileURLToPath(new URL('../../../backend/', import.meta.url));
const { PORT = '3340' } = process.env;
Object.assign(process.env, {
  DATABASE_URL: `file:${join(directory, 'e2e.db')}`,
  JWT_SECRET: randomBytes(48).toString('hex'),
  ADMIN_EMAIL: admin.email,
  ADMIN_PASSWORD: admin.password,
  SEED_DEMO: 'true',
  NODE_ENV: 'test',
  FRONTEND_DIST: fileURLToPath(new URL('../../dist/', import.meta.url)),
  CORS_ORIGIN: `http://127.0.0.1:${PORT}`,
});

let server;
let prisma;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (server) await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
  if (prisma) await prisma.$disconnect();
  await rm(directory, { recursive: true, force: true });
}

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

try {
  const run = (...args) => execFileSync(process.execPath, args, { cwd: backend, stdio: 'inherit' });
  run('node_modules/prisma/build/index.js', 'migrate', 'deploy');
  run('prisma/seed.js');
  ({ prisma } = await import('../../../backend/src/lib/prisma.js'));
  const { app } = await import('../../../backend/src/app.js');
  server = app.listen(Number(PORT), '127.0.0.1', () => console.log(`E2E: http://127.0.0.1:${PORT}`));
} catch (error) {
  await stop();
  throw error;
}
