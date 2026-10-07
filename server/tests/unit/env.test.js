const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadLocalEnv } = require('../../src/lib/env');

let dir;
const KEYS = ['CUANTOES_TEST_A', 'CUANTOES_TEST_B'];

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuantoes-env-'));
  KEYS.forEach((k) => delete process.env[k]);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  KEYS.forEach((k) => delete process.env[k]);
});

describe('loadLocalEnv', () => {
  test('carga las claves que no están definidas', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, '# comentario\nCUANTOES_TEST_A=desde-archivo\n');

    loadLocalEnv(file);

    expect(process.env.CUANTOES_TEST_A).toBe('desde-archivo');
  });

  test('no pisa una variable ya definida en el entorno', () => {
    const file = path.join(dir, '.env');
    fs.writeFileSync(file, 'CUANTOES_TEST_A=desde-archivo\nCUANTOES_TEST_B=nueva\n');
    process.env.CUANTOES_TEST_A = 'desde-entorno';

    loadLocalEnv(file);

    expect(process.env.CUANTOES_TEST_A).toBe('desde-entorno');
    expect(process.env.CUANTOES_TEST_B).toBe('nueva');
  });

  test('no falla si el archivo no existe', () => {
    expect(() => loadLocalEnv(path.join(dir, 'no-existe.env'))).not.toThrow();
  });
});
