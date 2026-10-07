// US3 — Gastos individuales (FR-003a, FR-016 a FR-020).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');
const f = require('../setup/factories');

const app = createApp();
let ana, beto, carla, group, anaM, betoM, dani, nafta, super_;

beforeEach(async () => {
  await resetDb();
  [ana, beto, carla] = await Promise.all(['Ana', 'Beto', 'Carla'].map(f.createUser));
  group = await f.createGroup(ana);
  anaM = await f.addMember(group, { user: ana });
  betoM = await f.addMember(group, { user: beto });
  dani = await f.addMember(group, { alias: 'Dani' });
  nafta = await f.createCategory(group, ana, 'Nafta', [anaM, dani]);
  super_ = await f.createCategory(group, ana, 'Súper', [anaM, betoM, dani]);
});
afterAll(disconnect);

const listUrl = (category = nafta) => `/groups/${group.id}/categories/${category.id}/expenses`;
const itemUrl = (id) => `/groups/${group.id}/expenses/${id}`;
const as = (who) => ({
  get: (u) => request(app).get(u).set('Authorization', who.auth),
  post: (u, body) => request(app).post(u).set('Authorization', who.auth).send(body),
  patch: (u, body) => request(app).patch(u).set('Authorization', who.auth).send(body),
  delete: (u) => request(app).delete(u).set('Authorization', who.auth),
});
const valid = () => ({ paidById: dani.id, amount: '15000.50', date: '2026-10-05', description: ' YPF ruta 9 ' });

describe('POST …/categories/:categoryId/expenses', () => {
  test('US3-2: registra el gasto con los datos exactos', async () => {
    const res = await as(beto).post(listUrl(), valid());

    expect(res.status).toBe(201);
    expect(res.body.expense).toMatchObject({
      categoryId: nafta.id,
      paidBy: { id: dani.id, displayName: 'Dani' },
      amount: '15000.50',
      date: '2026-10-05',
      description: 'YPF ruta 9',
      createdBy: { id: beto.user.id, name: 'Beto' },
    });
  });

  test('acepta un número JSON y lo devuelve con 2 decimales; descripción vacía → null', async () => {
    const res = await as(ana).post(listUrl(), { ...valid(), amount: 300, description: '   ' });
    expect(res.status).toBe(201);
    expect(res.body.expense.amount).toBe('300.00');
    expect(res.body.expense.description).toBeNull();
  });

  test.each(['0', '-1', '1.234', 10000000000, 'abc', 0.001])(
    'FR-017: monto %p → 400 con fields.amount',
    async (amount) => {
      const res = await as(ana).post(listUrl(), { ...valid(), amount });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.amount).toBeDefined();
    },
  );

  test.each([
    ['sin fecha', { date: undefined }],
    ['fecha inexistente', { date: '2026-02-30' }],
    ['fecha con otro formato', { date: '05/10/2026' }],
    ['descripción de 201 caracteres', { description: 'a'.repeat(201) }],
  ])('%s → 400', async (_caso, override) => {
    const res = await as(ana).post(listUrl(), { ...valid(), ...override });
    expect(res.status).toBe(400);
  });

  test('US3-5: pagado por alguien que no participa de la categoría → 400 fields.paidById', async () => {
    const res = await as(ana).post(listUrl(), { ...valid(), paidById: betoM.id });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.paidById).toBe('Quien pagó tiene que participar de la categoría');
  });

  test('pagado por un miembro de otro grupo → 400', async () => {
    const other = await f.createGroup(ana, 'Casa');
    const eva = await f.addMember(other, { alias: 'Eva' });
    expect((await as(ana).post(listUrl(), { ...valid(), paidById: eva.id })).status).toBe(400);
  });

  test('categoría que no es UUID, de otro grupo o ajeno al grupo → 404', async () => {
    const other = await f.createGroup(carla, 'Casa');
    const ajena = await f.createCategory(other, carla, 'Ajena', []);
    expect((await as(ana).post(`/groups/${group.id}/categories/abc/expenses`, valid())).status).toBe(404);
    expect((await as(ana).post(listUrl(ajena), valid())).status).toBe(404);
    expect((await as(carla).post(listUrl(), valid())).status).toBe(404);
  });

  test('registrar un gasto recalcula las pendientes', async () => {
    await as(ana).post(listUrl(), { ...valid(), paidById: anaM.id, amount: '300' }).expect(201);
    const pending = await prisma.settlement.findMany({ where: { groupId: group.id, paid: false } });
    expect(pending.map((s) => [s.debtorId, s.creditorId, s.amount.toFixed(2)])).toEqual([
      [dani.id, anaM.id, '150.00'],
    ]);
  });
});

describe('GET …/expenses', () => {
  test('FR-019: ordenados por fecha, el más reciente primero', async () => {
    await f.createExpense(nafta, dani, '1.00', ana, { date: '2026-10-01' });
    await f.createExpense(nafta, anaM, '2.00', ana, { date: '2026-10-09' });
    await f.createExpense(nafta, dani, '3.00', ana, { date: '2026-10-05' });

    const res = await as(beto).get(listUrl());

    expect(res.status).toBe(200);
    expect(res.body.expenses.map((e) => [e.date, e.amount])).toEqual([
      ['2026-10-09', '2.00'],
      ['2026-10-05', '3.00'],
      ['2026-10-01', '1.00'],
    ]);
  });

  test('GET de un gasto; de otro grupo o que no es UUID → 404', async () => {
    const expense = await f.createExpense(nafta, dani, '10.00', ana);
    expect((await as(beto).get(itemUrl(expense.id))).body.expense.id).toBe(expense.id);

    const other = await f.createGroup(ana, 'Casa');
    const eva = await f.addMember(other, { alias: 'Eva' });
    const ajena = await f.createCategory(other, ana, 'Ajena', [eva]);
    const ajeno = await f.createExpense(ajena, eva, '1.00', ana);
    expect((await as(ana).get(itemUrl(ajeno.id))).status).toBe(404);
    expect((await as(ana).get(itemUrl('abc'))).status).toBe(404);
    expect((await as(ana).patch(itemUrl('abc'), { amount: '1' })).status).toBe(404);
    expect((await as(ana).delete(itemUrl('abc'))).status).toBe(404);
  });
});

describe('PATCH y DELETE /groups/:groupId/expenses/:expenseId', () => {
  let expense;
  beforeEach(async () => {
    expense = await f.createExpense(nafta, dani, '100.00', beto);
  });

  test('US3-4: quien lo cargó modifica monto, fecha, descripción, pagador y categoría', async () => {
    const res = await as(beto).patch(itemUrl(expense.id), {
      amount: '250.75',
      date: '2026-10-06',
      description: 'Shell',
      paidById: anaM.id,
      categoryId: super_.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.expense).toMatchObject({
      amount: '250.75',
      date: '2026-10-06',
      description: 'Shell',
      paidBy: { id: anaM.id },
      categoryId: super_.id,
    });
  });

  test('moverlo a una categoría donde el pagador no participa → 400', async () => {
    const solo = await f.createCategory(group, ana, 'Solo Beto', [betoM]);
    const res = await as(beto).patch(itemUrl(expense.id), { categoryId: solo.id });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.paidById).toBeDefined();
  });

  test('cuerpo sin campos → 400', async () => {
    expect((await as(beto).patch(itemUrl(expense.id), {})).status).toBe(400);
  });

  test('US3-7: otro miembro no puede modificarlo ni borrarlo (403), pero sí verlo', async () => {
    await f.addMember(group, { user: carla });
    expect((await as(carla).patch(itemUrl(expense.id), { amount: '1' })).status).toBe(403);
    expect((await as(carla).delete(itemUrl(expense.id))).status).toBe(403);
    expect((await as(carla).get(itemUrl(expense.id))).status).toBe(200);
  });

  test('el dueño del grupo puede modificar el gasto de otro', async () => {
    expect((await as(ana).patch(itemUrl(expense.id), { amount: '120' })).status).toBe(200);
  });

  test('modificar y borrar recalculan las pendientes', async () => {
    await as(beto).patch(itemUrl(expense.id), { amount: '300' }).expect(200);
    let pending = await prisma.settlement.findMany({ where: { paid: false } });
    expect(pending.map((s) => [s.debtorId, s.amount.toFixed(2)])).toEqual([[anaM.id, '150.00']]);

    expect((await as(beto).delete(itemUrl(expense.id))).status).toBe(204);
    pending = await prisma.settlement.findMany({ where: { paid: false } });
    expect(pending).toEqual([]);
    expect(await prisma.expense.count()).toBe(0);
  });
});
