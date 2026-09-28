import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { roleSchema } from '../schemas/auth.schema.js';
import { auditQuerySchema, idParamSchema } from '../schemas/transaction.schema.js';
import { listAudit } from '../services/transaction.service.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const userSelect = { id: true, name: true, email: true, role: true, createdAt: true };

router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    res.json(await prisma.user.findMany({ select: userSelect, orderBy: { id: 'asc' } }));
  }),
);

router.patch(
  '/users/:id/role',
  validate(idParamSchema, 'params'),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    // Evita que o último admin se rebaixe e deixe o sistema sem administrador.
    if (req.params.id === req.user.id) {
      throw new AppError(400, 'Você não pode alterar o seu próprio perfil');
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw new AppError(404, 'Usuário não encontrado');

    res.json(
      await prisma.user.update({
        where: { id: target.id },
        data: { role: req.body.role },
        select: userSelect,
      }),
    );
  }),
);

router.get(
  '/audit',
  validate(auditQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await listAudit(req.query))),
);

export default router;
