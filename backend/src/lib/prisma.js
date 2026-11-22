import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// O SQLite tem um escritor por vez. Uma conexão evita que transações interativas
// disputem o bloqueio entre a gravação do lançamento e a gravação da auditoria.
const queryStart = env.databaseUrl.indexOf('?');
const file = queryStart < 0 ? env.databaseUrl : env.databaseUrl.slice(0, queryStart);
const options = new URLSearchParams(queryStart < 0 ? '' : env.databaseUrl.slice(queryStart + 1));
options.set('connection_limit', '1');
export const prisma = new PrismaClient({
  datasourceUrl: `${file}?${options}`,
});
