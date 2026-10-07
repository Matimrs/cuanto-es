// FR-025: sin configuración obligatoria el servicio no arranca y dice qué clave falta.
// Se mockea la carga del .env para que solo cuente el entorno que fija cada test.
jest.mock('../../src/lib/env', () => ({ loadLocalEnv: jest.fn() }));

const ORIGINAL_ENV = process.env;
const VALID = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

function loadConfig(env) {
  process.env = { ...env };
  let config;
  jest.isolateModules(() => {
    config = require('../../src/config');
  });
  return config;
}

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('config', () => {
  test('con la configuración mínima usa los valores por defecto', () => {
    const config = loadConfig(VALID);
    expect(config).toEqual({
      databaseUrl: VALID.DATABASE_URL,
      jwtSecret: VALID.JWT_SECRET,
      port: 3001,
      bcryptRounds: 12,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  test('falta JWT_SECRET → error que la nombra', () => {
    expect(() => loadConfig({ DATABASE_URL: VALID.DATABASE_URL })).toThrow(/JWT_SECRET/);
  });

  test('JWT_SECRET de menos de 32 caracteres → error', () => {
    expect(() => loadConfig({ ...VALID, JWT_SECRET: 'corto' })).toThrow(/JWT_SECRET.*32/);
  });

  test('falta DATABASE_URL → error que la nombra', () => {
    expect(() => loadConfig({ JWT_SECRET: VALID.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });

  test('lee PORT y BCRYPT_ROUNDS', () => {
    const config = loadConfig({ ...VALID, PORT: '4000', BCRYPT_ROUNDS: '10' });
    expect(config.port).toBe(4000);
    expect(config.bcryptRounds).toBe(10);
  });

  test.each([
    ['BCRYPT_ROUNDS', 'abc'],
    ['BCRYPT_ROUNDS', '3'],
    ['PORT', 'no-es-numero'],
  ])('%s=%s → error que la nombra', (key, value) => {
    expect(() => loadConfig({ ...VALID, [key]: value })).toThrow(new RegExp(key));
  });
});
