const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');

const app = createApp();
const valid = { name: 'Ana', email: 'ana@ejemplo.com', password: 'secreta123' };

function register(body) {
  return request(app).post('/auth/register').send(body);
}

beforeEach(resetDb);
afterAll(disconnect);

describe('POST /auth/register', () => {
  test('escenario 1: crea la cuenta y devuelve datos públicos y token', async () => {
    const res = await register({ ...valid, email: ' ANA@Ejemplo.com ' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Ana',
      email: 'ana@ejemplo.com',
    });
    expect(typeof res.body.token).toBe('string');
    expect(JSON.stringify(res.body)).not.toMatch(/password|secreta123/i);

    const stored = await prisma.user.findUnique({ where: { email: 'ana@ejemplo.com' } });
    expect(stored.passwordHash).toMatch(/^\$2/);
    expect(stored.passwordHash).not.toContain('secreta123');
  });

  test('escenario 2: rechaza un email ya registrado con otra capitalización', async () => {
    await register(valid).expect(201);

    const res = await register({ ...valid, name: 'Otra Ana', email: 'ANA@Ejemplo.com ' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'EMAIL_TAKEN', message: 'Ese email ya está registrado' },
    });
    expect(await prisma.user.count()).toBe(1);
  });

  test.each([
    ['email mal formado', { ...valid, email: 'ana-sin-arroba' }, 'email'],
    ['sin nombre', { email: valid.email, password: valid.password }, 'name'],
    ['contraseña corta', { ...valid, password: 'corta' }, 'password'],
  ])('escenario 3: %s → 400 con el campo inválido', async (_caso, body, field) => {
    const res = await register(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Hay datos inválidos');
    expect(typeof res.body.error.fields[field]).toBe('string');
    expect(await prisma.user.count()).toBe(0);
  });

  test('registros simultáneos con el mismo email crean una sola cuenta (SC-002)', async () => {
    const [a, b] = await Promise.all([
      register(valid),
      register({ ...valid, email: 'ANA@ejemplo.com' }),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.user.count()).toBe(1);
  });

  test('rechaza contraseñas de más de 72 bytes', async () => {
    const res = await register({ ...valid, password: '€'.repeat(25) });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.password).toBeDefined();
  });

  test('cuerpo vacío → 400 sin detalles internos', async () => {
    const res = await request(app).post('/auth/register');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|at /i);
  });

  test('JSON mal formado → 400 sin detalles internos', async () => {
    const res = await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ana",');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: 'Hay datos inválidos' } });
  });

  test('ignora los campos que el cliente no puede fijar', async () => {
    const forgedId = '00000000-0000-0000-0000-000000000000';
    const res = await register({ ...valid, id: forgedId, passwordHash: 'hackeado' });

    expect(res.status).toBe(201);
    expect(res.body.user.id).not.toBe(forgedId);
    const stored = await prisma.user.findUnique({ where: { email: valid.email } });
    expect(stored.passwordHash).not.toBe('hackeado');
  });
});
