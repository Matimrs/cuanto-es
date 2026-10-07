const { Prisma } = require('@prisma/client');
const HttpError = require('../lib/httpError');

function send(res, status, code, message, fields) {
  const error = { code, message };
  if (fields) error.fields = fields;
  res.status(status).json({ error });
}

function isUniqueEmailViolation(err) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return false;
  }
  const target = err.meta && err.meta.target;
  const fields = Array.isArray(target) ? target : [String(target)];
  return fields.some((f) => f.includes('email'));
}

function isDatabaseUnavailable(err) {
  return (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P1017'].includes(err.code))
  );
}

// Manejador central de errores (research R12). Nunca devuelve trazas ni detalles internos
// (FR-013) y nunca registra el cuerpo de la solicitud (FR-005).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return send(res, err.status, err.code, err.message, err.fields);
  }
  if (err.type === 'entity.parse.failed') {
    return send(res, 400, 'VALIDATION_ERROR', 'Hay datos inválidos');
  }
  if (isUniqueEmailViolation(err)) {
    return send(res, 409, 'EMAIL_TAKEN', 'Ese email ya está registrado');
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err.stack || err);

  if (isDatabaseUnavailable(err)) {
    return send(
      res,
      503,
      'SERVICE_UNAVAILABLE',
      'El servicio no está disponible. Probá de nuevo en unos minutos.',
    );
  }
  return send(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado');
}

module.exports = errorHandler;
