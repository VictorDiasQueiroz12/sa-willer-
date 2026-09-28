// Encaminha erros de handlers assíncronos para o errorHandler do Express 4.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
