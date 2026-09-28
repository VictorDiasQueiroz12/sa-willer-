import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

const isAdmin = (user) => user.role === 'ADMIN';

export const toPublic = (t) => ({
  id: t.id,
  description: t.description,
  amount: Number(t.amountCents) / 100,
  amountCents: Number(t.amountCents),
  type: t.type,
  category: t.category,
  date: t.date,
  createdById: t.createdById,
  createdByName: t.createdBy?.name,
  createdAt: t.createdAt,
  updatedById: t.updatedById,
  updatedAt: t.updatedAt,
  deletedById: t.deletedById,
  deletedAt: t.deletedAt,
});

const snapshot = (t) => JSON.stringify(toPublic(t));

/** USER só enxerga o que criou. ADMIN enxerga tudo (scope=all) ou só o próprio (scope=mine). */
const ownerFilter = (user, scope = 'all') =>
  isAdmin(user) && scope === 'all' ? {} : { createdById: user.id };

async function findAccessible(user, id, { deleted = false } = {}) {
  const tx = await prisma.transaction.findFirst({
    where: { id, ...ownerFilter(user), deletedAt: deleted ? { not: null } : null },
  });
  // 404 (e não 403) evita revelar a existência de transações de outros usuários.
  if (!tx) throw new AppError(404, 'Transação não encontrada');
  return tx;
}

/** Bloqueia lançamentos duplicados (mesmo dono, descrição, valor, tipo e data). */
async function assertNotDuplicate(data, ownerId, ignoreId) {
  const duplicate = await prisma.transaction.findFirst({
    where: {
      createdById: ownerId,
      description: data.description,
      amountCents: BigInt(data.amountCents),
      type: data.type,
      date: data.date,
      deletedAt: null,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new AppError(409, `Lançamento duplicado (já existe a transação #${duplicate.id})`);
  }
}

export async function list(user, query) {
  const where = { ...ownerFilter(user, query.scope) };
  if (!(isAdmin(user) && query.includeDeleted)) where.deletedAt = null;
  if (query.type) where.type = query.type;
  if (query.from || query.to) {
    where.date = { ...(query.from && { gte: query.from }), ...(query.to && { lte: query.to }) };
  }

  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    items: items.map(toPublic),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getById(user, id) {
  const tx = await findAccessible(user, id);
  return toPublic(tx);
}

export async function balance(user, scope) {
  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where: { ...ownerFilter(user, scope), deletedAt: null },
    _sum: { amountCents: true },
  });
  const sumOf = (type) => Number(groups.find((g) => g.type === type)?._sum.amountCents ?? 0n);

  const incomeCents = sumOf('INCOME');
  const expenseCents = sumOf('EXPENSE');
  return {
    income: incomeCents / 100,
    expense: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    currency: 'BRL',
    scope: isAdmin(user) ? scope : 'mine',
  };
}

export async function create(user, data) {
  await assertNotDuplicate(data, user.id);

  const created = await prisma.$transaction(async (db) => {
    const tx = await db.transaction.create({
      data: {
        description: data.description,
        amountCents: BigInt(data.amountCents),
        type: data.type,
        category: data.category ?? null,
        date: data.date,
        createdById: user.id,
      },
    });
    await db.auditLog.create({
      data: { action: 'CREATE', transactionId: tx.id, userId: user.id, after: snapshot(tx) },
    });
    return tx;
  });
  return toPublic(created);
}

export async function update(user, id, data) {
  const before = await findAccessible(user, id);
  await assertNotDuplicate(data, before.createdById, id);

  const updated = await prisma.$transaction(async (db) => {
    const tx = await db.transaction.update({
      where: { id },
      data: {
        description: data.description,
        amountCents: BigInt(data.amountCents),
        type: data.type,
        category: data.category ?? null,
        date: data.date,
        updatedById: user.id,
      },
    });
    await db.auditLog.create({
      data: {
        action: 'UPDATE',
        transactionId: id,
        userId: user.id,
        before: snapshot(before),
        after: snapshot(tx),
      },
    });
    return tx;
  });
  return toPublic(updated);
}

/** Soft delete: marca como excluído; o registro permanece no banco para rastreabilidade. */
export async function softDelete(user, id) {
  const before = await findAccessible(user, id);

  await prisma.$transaction(async (db) => {
    const tx = await db.transaction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    await db.auditLog.create({
      data: {
        action: 'DELETE',
        transactionId: id,
        userId: user.id,
        before: snapshot(before),
        after: snapshot(tx),
      },
    });
  });
}

export async function restore(user, id) {
  const before = await findAccessible(user, id, { deleted: true });

  const restored = await prisma.$transaction(async (db) => {
    const tx = await db.transaction.update({
      where: { id },
      data: { deletedAt: null, deletedById: null, updatedById: user.id },
    });
    await db.auditLog.create({
      data: {
        action: 'RESTORE',
        transactionId: id,
        userId: user.id,
        before: snapshot(before),
        after: snapshot(tx),
      },
    });
    return tx;
  });
  return toPublic(restored);
}

export async function listAudit({ page, limit, transactionId }) {
  const where = transactionId ? { transactionId } : {};
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((log) => ({
      ...log,
      before: log.before ? JSON.parse(log.before) : null,
      after: log.after ? JSON.parse(log.after) : null,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
