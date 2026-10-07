// SC-003: mide el p95 de las liquidaciones con un grupo de 20 miembros, 10 categorías y 500 gastos,
// contra una API levantada. Mide la consulta (GET) y el alta de un gasto, que dispara el recálculo.
// Uso: node scripts/settlements-p95.js [URL_BASE] [MEDICIONES]   (por defecto http://localhost:3001, 20)
const baseUrl = process.argv[2] || 'http://localhost:3001';
const runs = Number(process.argv[3] || 20);
const LIMIT_MS = 2000;
const MEMBERS = 20;
const CATEGORIES = 10;
const EXPENSES = 500;

let seed = 20261007;
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
};

let auth;
async function call(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: auth }) },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function measure(label, fn) {
  const times = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    await fn(i);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const p95 = times[Math.ceil(0.95 * times.length) - 1];
  const median = times[Math.floor(times.length / 2)];
  const ok = p95 < LIMIT_MS;
  console.log(`${label}: mediana ${median.toFixed(0)} ms | p95 ${p95.toFixed(0)} ms → ${ok ? 'OK' : 'FALLA'}`);
  return ok;
}

async function main() {
  const email = `p95-grupos-${Date.now()}@ejemplo.com`;
  const { token } = await call('POST', '/auth/register', { name: 'Medición', email, password: 'medicion-p95' });
  auth = `Bearer ${token}`;

  const { group } = await call('POST', '/groups', { name: 'Grupo de medición' });
  const members = [];
  for (let i = 0; i < MEMBERS; i += 1) {
    members.push((await call('POST', `/groups/${group.id}/members`, { alias: `Miembro ${i + 1}` })).member);
  }
  const categories = [];
  for (let i = 0; i < CATEGORIES; i += 1) {
    categories.push((await call('POST', `/groups/${group.id}/categories`, { name: `Categoría ${i + 1}` })).category);
  }

  const addExpense = () => {
    const category = categories[rnd(CATEGORIES)];
    const member = members[rnd(MEMBERS)];
    const cents = 100 + rnd(5000000);
    return call('POST', `/groups/${group.id}/categories/${category.id}/expenses`, {
      paidById: member.id,
      amount: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`,
      date: '2026-10-07',
    });
  };

  console.log(`Cargando ${EXPENSES} gastos…`);
  for (let i = 0; i < EXPENSES; i += 1) await addExpense();

  const view = await call('GET', `/groups/${group.id}/settlements`);
  console.log(`Grupo listo: ${MEMBERS} miembros, ${CATEGORIES} categorías, ${EXPENSES} gastos, ${view.pending.length} pendientes`);

  const okGet = await measure(`GET  /settlements (${runs} veces)`, () => call('GET', `/groups/${group.id}/settlements`));
  const okPost = await measure(`POST gasto + recálculo (${runs} veces)`, addExpense);

  await call('DELETE', `/groups/${group.id}`);
  process.exitCode = okGet && okPost ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
