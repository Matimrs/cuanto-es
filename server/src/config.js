const { loadLocalEnv } = require('./lib/env');

loadLocalEnv();

function fail(key, reason) {
  throw new Error(`Configuración inválida: ${key} ${reason}`);
}

function readInt(key, defaultValue, min, max) {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(key, `debe ser un entero entre ${min} y ${max}`);
  }
  return value;
}

function buildConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) fail('DATABASE_URL', 'es obligatoria y no está definida');

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) fail('JWT_SECRET', 'es obligatoria y no está definida');
  if (jwtSecret.length < 32) fail('JWT_SECRET', 'debe tener al menos 32 caracteres');

  return Object.freeze({
    databaseUrl,
    jwtSecret,
    port: readInt('PORT', 3001, 1, 65535),
    bcryptRounds: readInt('BCRYPT_ROUNDS', 12, 4, 15),
  });
}

module.exports = buildConfig();
