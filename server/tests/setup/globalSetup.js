const path = require('node:path');
const { execSync } = require('node:child_process');
const { loadLocalEnv } = require('../../src/lib/env');

// Aplica las migraciones reales sobre la base de test antes de la suite (research R9).
module.exports = async function globalSetup() {
  loadLocalEnv();

  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('Falta TEST_DATABASE_URL en server/.env (ver server/.env.example)');
  }

  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });
};
