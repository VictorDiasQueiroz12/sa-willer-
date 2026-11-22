import { z } from 'zod';
import { parseAmountToCents } from '../utils/money.js';

const amountField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const cents = parseAmountToCents(value);
  if (cents === null) {
    ctx.addIssue({
      code: 'custom',
      message: 'Informe um valor positivo, com até 9 dígitos inteiros e 2 casas decimais',
    });
    return z.NEVER;
  }
  return cents;
});

const calendarDate = z
  .iso.date('Informe uma data válida no formato AAAA-MM-DD')
  .refine((value) => !value.startsWith('0000'), 'O ano deve ser maior que zero')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const transactionBodySchema = z
  .object({
    description: z.string().trim().min(3, 'Descrição muito curta').max(120),
    amount: amountField,
    type: z.enum(['INCOME', 'EXPENSE'], { message: 'Tipo deve ser INCOME ou EXPENSE' }),
    category: z.string().trim().max(60).optional().nullable(),
    date: calendarDate,
  })
  .strict()
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const pagination = {
  page: z.coerce.number().int().min(1).max(2_147_483_647).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const transactionFilters = {
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  q: z.string().trim().max(120).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  scope: z.enum(['all', 'mine']).default('all'),
  includeDeleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
};

const orderedPeriod = ({ from, to }) => !from || !to || from <= to;
const periodError = {
  path: ['to'],
  message: 'A data final não pode ser anterior à inicial',
};

export const listQuerySchema = z.object({ ...pagination, ...transactionFilters })
  .refine(orderedPeriod, periodError);

export const exportQuerySchema = z.object(transactionFilters).refine(orderedPeriod, periodError);

export const balanceQuerySchema = z.object({ scope: z.enum(['all', 'mine']).default('all') });

export const monthlyQuerySchema = balanceQuerySchema.extend({
  month: z.string().regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/, 'Informe um mês válido no formato AAAA-MM'),
});

export const auditQuerySchema = z.object({
  ...pagination,
  transactionId: z.coerce.number().int().positive().optional(),
});
