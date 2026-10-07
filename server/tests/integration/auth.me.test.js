const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { signToken } = require('../../src/lib/tokens');
const { prisma, resetDb, disconnect } = require('../setup/db');

const app = createApp();
const UNAUTHENTICATED = {
  error: { code: 'UNAUTHENTICATED', message: 'Necesitás iniciar sesión' },
};

function me(authorization) {
  const req = request(app).get('/auth/me');
  return authorization === undefined ? req : req.set('Authorization', authorization);
}

let ana;

beforeEach(async () => {
  await resetDb();
  ana = await prisma.user.create({
    data: { name: 'Ana', email: 'ana@ejemplo.com', passwordHash: '$2b$04$hashdeprueba' },
  });
});
afterAll(disconnect);

describe('GET /auth/me', () => {
  test('escenario 1: con un token válido devuelve los datos públicos', async () => {
    const res = await me(`Bearer ${signToken(ana.id)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: ana.id, name: 'Ana', email: 'ana@ejemplo.com' } });
  });

  test('funciona con el token que devuelve el login', async () => {
    const { hashPassword } = require('../../src/lib/passwords');
    await prisma.user.update({
      where: { id: ana.id },
      data: { passwordHash: await hashPassword('secreta123') },
    });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'ana@ejemplo.com', password: 'secreta123' });

    const res = await me(`Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(ana.id);
  });

  const cases = {
    'sin header': () => undefined,
    'header sin Bearer': () => signToken(ana.id),
    'Bearer vacío': () => 'Bearer ',
    'firma alterada': () => {
      const token = signToken(ana.id);
      const i = token.length - 10; // un carácter del medio de la firma
      return `Bearer ${token.slice(0, i)}${token[i] === 'A' ? 'B' : 'A'}${token.slice(i + 1)}`;
    },
    vencido: () =>
      `Bearer ${jwt.sign({ sub: ana.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -1 })}`,
    'firmado con otro secreto': () =>
      `Bearer ${jwt.sign({ sub: ana.id }, 'otro-secreto-de-al-menos-32-caracteres!!', { algorithm: 'HS256' })}`,
    'sub que no es un UUID': () => `Bearer ${signToken('no-es-un-uuid')}`,
  };

  test.each(Object.keys(cases))('escenario 2: token %s → 401 sin datos (SC-006)', async (name) => {
    const res = await me(cases[name]());

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });

  test('token de un usuario que ya no existe → 401', async () => {
    const token = signToken(ana.id);
    await prisma.user.delete({ where: { id: ana.id } });

    const res = await me(`Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual(UNAUTHENTICATED);
  });
});
