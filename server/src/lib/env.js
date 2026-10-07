const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');

const DEFAULT_ENV_PATH = path.join(__dirname, '..', '..', '.env');

/**
 * Carga server/.env en process.env sin pisar variables ya definidas (research R7):
 * el entorno del contenedor y el que fijan los tests siempre tienen prioridad.
 * Si el archivo no existe, no hace nada.
 */
function loadLocalEnv(envPath = DEFAULT_ENV_PATH) {
  if (!fs.existsSync(envPath)) return;

  const parsed = util.parseEnv(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

module.exports = { loadLocalEnv, DEFAULT_ENV_PATH };
