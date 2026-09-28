import 'dotenv/config';

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Variáveis de ambiente ausentes: ${missing.join(', ')}. Copie .env.example para .env.`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
}

export const env = {
  port: Number(process.env.PORT) || 3333,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
