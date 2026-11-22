import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { readFileSync } from 'node:fs';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transaction.routes.js';

export const app = express();
const openapi = JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'));

app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/openapi.json', (_req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'FinTech Flow · API',
  swaggerOptions: { validatorUrl: null },
}));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);
if (env.frontendDist) app.use(express.static(env.frontendDist));

app.use(notFound);
app.use(errorHandler);
