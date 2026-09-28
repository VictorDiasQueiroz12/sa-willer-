import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Token não informado');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }

  // Busca o usuário a cada requisição: mudanças de perfil valem imediatamente.
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) throw new AppError(401, 'Usuário não encontrado');

  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(403, 'Você não tem permissão para esta ação'));
  }
  next();
};
