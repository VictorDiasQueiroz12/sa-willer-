import { AppError } from '../utils/AppError.js';

export const notFound = (_req, _res, next) => next(new AppError(404, 'Rota não encontrada'));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON malformado' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Registro já existe' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
};
