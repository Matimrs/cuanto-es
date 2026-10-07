const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { verifyToken } = require('../lib/tokens');
const { toPublicUser } = require('../lib/users');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unauthenticated() {
  return new HttpError(401, 'UNAUTHENTICATED', 'Necesitás iniciar sesión');
}

/**
 * Exige `Authorization: Bearer <token>` válido y deja el usuario en req.user (FR-010, FR-011).
 * Es genérico: la Fase 2 lo reutiliza en todos los endpoints salvo /auth/* (Principio VI).
 */
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthenticated());

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthenticated());
  }
  if (typeof payload.sub !== 'string' || !UUID_RE.test(payload.sub)) {
    return next(unauthenticated());
  }

  // Si la base no responde, el error sigue al errorHandler (503), no se disfraza de 401.
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return next(unauthenticated());

  req.user = toPublicUser(user);
  return next();
}

module.exports = requireAuth;
