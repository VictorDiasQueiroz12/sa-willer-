import { z } from 'zod';
import { parseAmountToCents } from '../utils/money.js';

const amountField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const cents = parseAmountToCents(value);
  if (cents === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O valor deve ser positivo, maior que zero e ter no máximo 2 casas decimais',
    });
    return z.NEVER;
  }
  return cents;
});

export const transactionBodySchema = z
  .object({
    description: z.string().trim().min(3, 'Descrição muito curta').max(120),
    amount: amountField,
    type: z.enum(['INCOME', 'EXPENSE'], { message: 'Tipo deve ser INCOME ou EXPENSE' }),
    category: z.string().trim().max(60).optional().nullable(),
    date: z.coerce.date({ message: 'Data inválida' }),
  })
  .strict()
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const listQuerySchema = z.object({
  ...pagination,
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  scope: z.enum(['all', 'mine']).default('all'),
  includeDeleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const balanceQuerySchema = z.object({ scope: z.enum(['all', 'mine']).default('all') });

export const auditQuerySchema = z.object({
  ...pagination,
  transactionId: z.coerce.number().int().positive().optional(),
});
