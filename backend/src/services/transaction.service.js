import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import { transactionsCsv } from '../utils/csv.js';

const isAdmin = (user) => user.role === 'ADMIN';

export const toPublic = (t) => ({
  id: t.id,
  description: t.description,
  amountCents: t.amountCents.toString(),
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

async function findAccessible(db, user, id, { deleted = false } = {}) {
  const tx = await db.transaction.findFirst({
    where: { id, ...ownerFilter(user), deletedAt: deleted ? { not: null } : null },
  });
  // 404 (e não 403) evita revelar a existência de transações de outros usuários.
  if (!tx) throw new AppError(404, 'Transação não encontrada');
  return tx;
}

async function writeTransaction(operation) {
  try {
    return await prisma.$transaction(operation);
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError(409, 'Já existe um lançamento ativo com a mesma descrição, valor, tipo e data');
    }
    if (['P2034', 'P1008', 'P2024', 'P2028'].includes(error.code)) {
      throw new AppError(409, 'Outra operação está em andamento. Atualize a lista e tente novamente.');
    }
    throw error;
  }
}

const transactionFields = ({ description, amountCents, type, category, date }) => ({
  description, amountCents: BigInt(amountCents), type, category: category || null, date,
});

const startOfNextDay = (date) => new Date(date.getTime() + 86_400_000);

const newestFirst = [{ date: 'desc' }, { id: 'desc' }];
const creatorName = { createdBy: { select: { name: true } } };

function transactionFilter(user, query) {
  const where = { ...ownerFilter(user, query.scope) };
  if (!(isAdmin(user) && query.includeDeleted)) where.deletedAt = null;
  if (query.type) where.type = query.type;
  if (query.q) {
    where.OR = [
      { description: { contains: query.q } },
      { category: { contains: query.q } },
    ];
  }
  if (query.from || query.to) {
    where.date = {
      ...(query.from && { gte: query.from }),
      ...(query.to && { lt: startOfNextDay(query.to) }),
    };
  }
  return where;
}

export async function list(user, query) {
  const where = transactionFilter(user, query);
  const [items, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: creatorName,
      orderBy: newestFirst,
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

const EXPORT_LIMIT = 10_000;

export async function exportCsv(user, query) {
  const items = await prisma.transaction.findMany({
    where: transactionFilter(user, query),
    include: creatorName,
    orderBy: newestFirst,
    take: EXPORT_LIMIT + 1,
  });
  if (items.length > EXPORT_LIMIT) {
    throw new AppError(422, 'O CSV aceita até 10.000 lançamentos. Reduza o período ou aplique mais filtros.');
  }
  return transactionsCsv(items);
}

export async function getById(user, id) {
  const tx = await findAccessible(prisma, user, id);
  return toPublic(tx);
}

export async function balance(user, scope) {
  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where: { ...ownerFilter(user, scope), deletedAt: null },
    _sum: { amountCents: true },
  });
  return { ...summarize(groups), currency: 'BRL', scope: isAdmin(user) ? scope : 'mine' };
}

function summarize(groups) {
  const sumOf = (type) => groups.find((g) => g.type === type)?._sum.amountCents ?? 0n;
  const incomeCents = sumOf('INCOME');
  const expenseCents = sumOf('EXPENSE');
  return {
    incomeCents: incomeCents.toString(),
    expenseCents: expenseCents.toString(),
    balanceCents: (incomeCents - expenseCents).toString(),
  };
}

export async function monthlyReport(user, { scope, month }) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const where = { ...ownerFilter(user, scope), deletedAt: null, date: { gte: start, lt: end } };

  const [totals, categories] = await prisma.$transaction([
    prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { ...where, type: 'EXPENSE' },
      _sum: { amountCents: true },
      orderBy: [{ _sum: { amountCents: 'desc' } }, { category: 'asc' }],
      take: 5,
    }),
  ]);

  return {
    month,
    scope: isAdmin(user) ? scope : 'mine',
    ...summarize(totals),
    count: totals.reduce((sum, group) => sum + group._count._all, 0),
    topExpenses: categories.map((group) => ({
      category: group.category,
      amountCents: group._sum.amountCents.toString(),
    })),
  };
}

export async function create(user, data) {
  const created = await writeTransaction(async (db) => {
    const tx = await db.transaction.create({
      data: { ...transactionFields(data), createdById: user.id },
    });
    await db.auditLog.create({
      data: { action: 'CREATE', transactionId: tx.id, userId: user.id, after: snapshot(tx) },
    });
    return tx;
  });
  return toPublic(created);
}

export async function update(user, id, data) {
  const updated = await writeTransaction(async (db) => {
    const before = await findAccessible(db, user, id);
    const tx = await db.transaction.update({
      where: { id },
      data: { ...transactionFields(data), updatedById: user.id },
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
  await writeTransaction(async (db) => {
    const before = await findAccessible(db, user, id);
    const tx = await db.transaction.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id, updatedById: user.id },
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
  const restored = await writeTransaction(async (db) => {
    const before = await findAccessible(db, user, id, { deleted: true });
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

function parseSnapshot(value) {
  if (!value) return null;
  // Snapshots antigos usavam centavos numéricos; preserve o log gravado e normalize a resposta.
  const { amount: _legacyAmount, ...snapshot } = JSON.parse(value);
  return { ...snapshot, amountCents: String(snapshot.amountCents) };
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
      before: parseSnapshot(log.before),
      after: parseSnapshot(log.after),
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
