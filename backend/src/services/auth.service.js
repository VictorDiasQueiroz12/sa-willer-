import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 12;
// Hash fictício: mantém o tempo de resposta parecido quando o e-mail não existe.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', SALT_ROUNDS);

const toPublicUser = ({ id, name, email, role }) => ({ id, name, email, role });

function signToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

export async function register({ name, email, password }) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError(409, 'E-mail já cadastrado');

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, SALT_ROUNDS), role: 'USER' },
  });
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'E-mail ou senha inválidos');

  return { user: toPublicUser(user), token: signToken(user) };
}
