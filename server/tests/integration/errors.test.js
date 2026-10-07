// Respuestas de error transversales (FR-013) y ausencia de contraseñas en los logs (SC-003).
const { Prisma } = require('@prisma/client');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');

const app = createApp();
const PASSWORD = 'contraseña-que-no-debe-aparecer';
const body = { name: 'Ana', email: 'ana@ejemplo.com', password: PASSWORD };

let consoleSpies;

beforeEach(async () => {
  await resetDb();
  consoleSpies = ['log', 'info', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m).mockImplementation(() => {}),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(disconnect);

function loggedText() {
  return consoleSpies
    .flatMap((spy) => spy.mock.calls.flat())
    .map((arg) => (arg instanceof Error ? `${arg.message}\n${arg.stack}` : String(arg)))
    .join('\n');
}

function expectNoInternals(res) {
  expect(JSON.stringify(res.body)).not.toMatch(/stack|prisma|\.js:|at \w/i);
}

describe('errores transversales', () => {
  test('ruta inexistente → 404 NOT_FOUND', async () => {
    const res = await request(app).get('/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
  });

  test('base de datos no disponible → 503 sin detalles internos', async () => {
    jest
      .spyOn(prisma.user, 'create')
      .mockRejectedValue(
        new Prisma.PrismaClientInitializationError("Can't reach database server at db:5432", '6.19.3'),
      );

    const res = await request(app).post('/auth/register').send(body);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'El servicio no está disponible. Probá de nuevo en unos minutos.',
      },
    });
    expectNoInternals(res);
  });

  test('error inesperado → 500 sin stack en el cuerpo', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('fallo interno raro'));

    const res = await request(app).post('/auth/login').send({ email: body.email, password: PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
    });
    expectNoInternals(res);
  });
});

describe('SC-003: la contraseña nunca aparece en los logs', () => {
  test('ni en un registro que falla con error interno', async () => {
    jest.spyOn(prisma.user, 'create').mockRejectedValue(new Error('fallo al insertar'));

    const res = await request(app).post('/auth/register').send(body);

    expect(res.status).toBe(500);
    expect(loggedText()).toContain('fallo al insertar'); // el error sí se registra
    expect(loggedText()).not.toContain(PASSWORD);
  });

  test('ni en un inicio de sesión que falla con error interno', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockRejectedValue(new Error('fallo al buscar'));

    await request(app).post('/auth/login').send({ email: body.email, password: PASSWORD });

    expect(loggedText()).not.toContain(PASSWORD);
  });
});
