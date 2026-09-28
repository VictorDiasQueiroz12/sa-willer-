import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => res.status(201).json(await authService.register(req.body))),
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => res.json(await authService.login(req.body))),
);

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

export default router;
