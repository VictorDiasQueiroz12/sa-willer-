import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  balanceQuerySchema,
  idParamSchema,
  listQuerySchema,
  transactionBodySchema,
} from '../schemas/transaction.schema.js';
import * as service from '../services/transaction.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await service.list(req.user, req.query))),
);

// Deve vir antes de "/:id" para não ser interpretada como um id.
router.get(
  '/balance',
  validate(balanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => res.json(await service.balance(req.user, req.query.scope))),
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await service.getById(req.user, req.params.id))),
);

router.post(
  '/',
  validate(transactionBodySchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user, req.body))),
);

router.put(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(transactionBodySchema),
  asyncHandler(async (req, res) =>
    res.json(await service.update(req.user, req.params.id, req.body)),
  ),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    await service.softDelete(req.user, req.params.id);
    res.status(204).end();
  }),
);

router.post(
  '/:id/restore',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => res.json(await service.restore(req.user, req.params.id))),
);

export default router;
