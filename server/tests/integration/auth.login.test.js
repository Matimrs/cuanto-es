const request = require('supertest');
const { createApp } = require('../../src/app');
const { hashPassword } = require('../../src/lib/passwords');
const { verifyToken } = require('../../src/lib/tokens');
const { prisma, resetDb, disconnect } = require('../setup/db');

const app = createApp();
const INVALID_CREDENTIALS = {
  error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' },
};

function login(body) {
  return request(app).post('/auth/login').send(body);
}

let ana;

beforeEach(async () => {
  await resetDb();
  ana = await prisma.user.create({
    data: { name: 'Ana', email: 'ana@ejemplo.com', passwordHash: await hashPassword('secreta123') },
  });
});
afterAll(disconnect);

describe('POST /auth/login', () => {
  test('escenario 1: credenciales correctas (email con mayúsculas y espacios) → token', async () => {
    const res = await login({ email: '  ANA@Ejemplo.com ', password: 'secreta123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: ana.id, name: 'Ana', email: 'ana@ejemplo.com' });
    expect(verifyToken(res.body.token).sub).toBe(ana.id);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('escenarios 2 y 3: contraseña incorrecta y email inexistente → respuestas idénticas (SC-005)', async () => {
    const wrongPassword = await login({ email: 'ana@ejemplo.com', password: 'otra-clave' });
    const unknownEmail = await login({ email: 'nadie@ejemplo.com', password: 'secreta123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(INVALID_CREDENTIALS);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  test('una contraseña corta da 401, no 400 (no revela la política)', async () => {
    const res = await login({ email: 'ana@ejemplo.com', password: 'corta' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(INVALID_CREDENTIALS);
  });

  test('cuerpo inválido → 400', async () => {
    const res = await login({ email: 'no-es-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['email', 'password']);
  });
});
