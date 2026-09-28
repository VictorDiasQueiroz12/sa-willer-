import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/** Valida e substitui req[source] pelos dados já tipados/normalizados pelo schema. */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new AppError(400, 'Dados inválidos', details));
    }
    next(error);
  }
};
