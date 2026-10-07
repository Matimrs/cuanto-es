const { Prisma } = require('@prisma/client');
const HttpError = require('../lib/httpError');

function send(res, status, code, message, fields) {
  const error = { code, message };
  if (fields) error.fields = fields;
  res.status(status).json({ error });
}

// Violaciones de unicidad (P2002) → 409 con su código. Prisma informa el modelo y las columnas
// (o expresiones) del índice: p. ej. { modelName: 'Category', target: ['group_id', 'lower(name::text)'] }.
const UNIQUE_VIOLATIONS = [
  { model: 'User', column: 'email', code: 'EMAIL_TAKEN', message: 'Ese email ya está registrado' },
  {
    model: 'Category',
    column: 'name',
    code: 'CATEGORY_NAME_TAKEN',
    message: 'Ya hay una categoría con ese nombre en el grupo',
  },
  {
    model: 'GroupMember',
    column: 'alias',
    code: 'ALIAS_TAKEN',
    message: 'Ya hay un invitado con ese alias en el grupo',
  },
  {
    model: 'GroupMember',
    column: 'user_id',
    code: 'ALREADY_MEMBER',
    message: 'Esa persona ya es miembro del grupo',
  },
  {
    model: 'CategoryParticipant',
    column: 'member_id',
    code: 'ALREADY_PARTICIPANT',
    message: 'Ese miembro ya participa de la categoría',
  },
];

function uniqueViolation(err) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return null;
  }
  const target = err.meta && err.meta.target;
  const columns = (Array.isArray(target) ? target : [String(target)]).join(' ');
  return (
    UNIQUE_VIOLATIONS.find(
      (v) => (!err.meta.modelName || err.meta.modelName === v.model) && columns.includes(v.column),
    ) ?? null
  );
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
  const violation = uniqueViolation(err);
  if (violation) {
    return send(res, 409, violation.code, violation.message);
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
