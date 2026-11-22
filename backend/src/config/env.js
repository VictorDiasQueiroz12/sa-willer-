import 'dotenv/config';

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}. Copie .env.example para .env.`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
}

const trustProxy = Number(process.env.TRUST_PROXY || 0);
if (!Number.isSafeInteger(trustProxy) || trustProxy < 0) {
  throw new Error('TRUST_PROXY deve ser o número de proxies confiáveis entre o cliente e a API.');
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  port: Number(process.env.PORT) || 3333,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  frontendDist: process.env.FRONTEND_DIST || null,
  trustProxy,
};
