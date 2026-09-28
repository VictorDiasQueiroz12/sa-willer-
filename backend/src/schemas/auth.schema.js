import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('E-mail inválido').max(120);

const password = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra')
  .regex(/\d/, 'A senha deve conter ao menos um número');

// `role` não é aceito no cadastro: todo novo usuário é USER (impede escalonamento de privilégio).
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome muito curto').max(80),
    email,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Informe a senha').max(72),
  })
  .strict();

export const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) }).strict();
