// Se ejecuta antes de cada archivo de test: apunta Prisma a la base de test.
const { loadLocalEnv } = require('../../src/lib/env');

loadLocalEnv();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Falta TEST_DATABASE_URL en server/.env (ver server/.env.example)');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.BCRYPT_ROUNDS = '4';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'secreto-de-test-de-al-menos-32-caracteres!!';
}
