// SC-004: mide el p95 del inicio de sesión contra una API levantada (BCRYPT_ROUNDS=12).
// Uso: node scripts/login-p95.js [URL_BASE] [CANTIDAD]   (por defecto http://localhost:3001, 20)
const baseUrl = process.argv[2] || 'http://localhost:3001';
const count = Number(process.argv[3] || 20);
const LIMIT_MS = 2000;

const credentials = {
  name: 'Medición p95',
  email: `p95-${Date.now()}@ejemplo.com`,
  password: 'medicion-p95',
};

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await res.text();
  return res.status;
}

async function main() {
  const status = await post('/auth/register', credentials);
  if (status !== 201) throw new Error(`No se pudo crear el usuario de prueba (HTTP ${status})`);

  const times = [];
  for (let i = 0; i < count; i += 1) {
    const start = performance.now();
    const loginStatus = await post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    times.push(performance.now() - start);
    if (loginStatus !== 200) throw new Error(`Login falló (HTTP ${loginStatus})`);
  }

  times.sort((a, b) => a - b);
  const p95 = times[Math.ceil(0.95 * times.length) - 1];
  const median = times[Math.floor(times.length / 2)];

  console.log(`Logins: ${count} | mediana: ${median.toFixed(0)} ms | p95: ${p95.toFixed(0)} ms`);
  console.log(p95 < LIMIT_MS ? `OK: p95 < ${LIMIT_MS} ms (SC-004)` : `FALLA: p95 ≥ ${LIMIT_MS} ms`);
  process.exitCode = p95 < LIMIT_MS ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
