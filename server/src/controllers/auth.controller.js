const crypto = require('node:crypto');
const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const { signToken } = require('../lib/tokens');
const { toPublicUser } = require('../lib/users');

// Hash ficticio con el mismo costo que los reales: si el email no existe se compara igual
// contra él, para que el tiempo de respuesta no revele qué emails tienen cuenta (FR-008).
const dummyHashPromise = hashPassword(crypto.randomBytes(32).toString('hex'));

function invalidCredentials() {
  return new HttpError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');
}

async function register(req, res) {
  const { name, email, password } = req.body;

  // Sin consulta previa: la unicidad la garantiza la base y el P2002 se traduce a 409 en el
  // errorHandler. Es la única forma de que dos registros simultáneos creen una sola cuenta (R13).
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  res.status(201).json({ user: toPublicUser(user), token: signToken(user.id) });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  const hash = user ? user.passwordHash : await dummyHashPromise;
  const matches = await verifyPassword(password, hash);

  if (!user || !matches) throw invalidCredentials();

  res.json({ user: toPublicUser(user), token: signToken(user.id) });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
