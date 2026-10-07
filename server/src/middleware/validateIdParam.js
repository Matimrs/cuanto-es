const HttpError = require('../lib/httpError');
const { isUuid } = require('../lib/ids');

// Para router.param: un id de ruta que no es UUID responde 404 antes de llegar a Prisma, que lo
// rechazaría con P2023 → 500 (Principio VI: toda entrada se valida en middleware).
function validateIdParam(req, res, next, value) {
  if (!isUuid(value)) return next(new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado'));
  return next();
}

module.exports = validateIdParam;
