// US4 — Ver quién le debe a quién, calculado por el sistema (FR-021 a FR-027b).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { resetDb, disconnect } = require('../setup/db');
const f = require('../setup/factories');

const app = createApp();
let ana, beto, carla, group, anaM, betoM, dani;

beforeEach(async () => {
  await resetDb();
  [ana, beto, carla] = await Promise.all(['Ana', 'Beto', 'Carla'].map(f.createUser));
  group = await f.createGroup(ana);
  anaM = await f.addMember(group, { user: ana });
  betoM = await f.addMember(group, { user: beto });
  dani = await f.addMember(group, { alias: 'Dani' });
});
afterAll(disconnect);

const view = (who = ana) =>
  request(app).get(`/groups/${group.id}/settlements`).set('Authorization', who.auth);
const transfers = (list) => list.map((s) => `${s.debtor.displayName}→${s.creditor.displayName} ${s.amount}`);
const balanceOf = (body, name) => body.balances.find((b) => b.displayName === name);

describe('GET /groups/:groupId/settlements', () => {
  test('US4-1: 300 pagados por Ana entre Ana, Beto y Dani', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM, dani]);
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);

    const res = await view(beto);

    expect(res.status).toBe(200);
    expect(transfers(res.body.pending)).toEqual(['Beto→Ana 100.00', 'Dani→Ana 100.00']);
    expect(res.body.paid).toEqual([]);
    expect(res.body.pending[1]).toMatchObject({
      debtor: { id: dani.id, displayName: 'Dani' },
      creditor: { id: anaM.id, displayName: 'Ana' },
      paid: false,
      paidAt: null,
      paidBy: null,
    });
  });

  test('US4-2: dos categorías con deudas cruzadas se unifican en una transferencia', async () => {
    const c1 = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    const c2 = await f.createCategory(group, ana, 'Súper', [anaM, betoM]);
    await f.createExpense(c1, betoM, '100.00', ana);
    await f.createExpense(c2, anaM, '30.00', ana);
    await f.recalc(group.id);

    expect(transfers((await view()).body.pending)).toEqual(['Ana→Beto 35.00']);
  });

  test('US4-3: una cadena se simplifica sin cambiar los saldos', async () => {
    const c1 = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    const c2 = await f.createCategory(group, ana, 'Súper', [betoM, dani]);
    await f.createExpense(c1, betoM, '20.00', ana);
    await f.createExpense(c2, dani, '40.00', ana);
    await f.recalc(group.id);

    const { body } = await view();
    const debtors = new Set(body.pending.map((s) => s.debtor.id));
    expect(body.pending.some((s) => debtors.has(s.creditor.id))).toBe(false);
    expect(body.balances.map((b) => b.pendingNet)).toEqual(['-10.00', '-10.00', '20.00']);
  });

  test('US4-4: 100 entre 3 → 33.33 y 33.33; Ana absorbe el centavo', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM, dani]);
    await f.createExpense(nafta, anaM, '100.00', ana);
    await f.recalc(group.id);

    const { body } = await view();
    expect(transfers(body.pending)).toEqual(['Beto→Ana 33.33', 'Dani→Ana 33.33']);
    expect(balanceOf(body, 'Ana')).toMatchObject({ contributed: '100.00', share: '33.34', pendingNet: '66.66' });
  });

  test('US4-5: sin gastos o con todo equilibrado → sin transferencias', async () => {
    expect((await view()).body.pending).toEqual([]);

    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    await f.createExpense(nafta, anaM, '50.00', ana);
    await f.createExpense(nafta, betoM, '50.00', ana);
    await f.recalc(group.id);
    expect((await view()).body.pending).toEqual([]);
  });

  test('US4-6: consultar no recalcula; un cambio sí', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM, dani]);
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);

    const first = (await view()).body.pending;
    const second = (await view()).body.pending;
    expect(second).toEqual(first);

    await request(app)
      .post(`/groups/${group.id}/categories/${nafta.id}/expenses`)
      .set('Authorization', beto.auth)
      .send({ paidById: betoM.id, amount: '60', date: '2026-10-06' })
      .expect(201);

    const third = (await view()).body.pending;
    expect(third.map((s) => s.id)).not.toContain(first[0].id);
    expect(transfers(third)).toEqual(['Beto→Ana 60.00', 'Dani→Ana 120.00']);
  });

  test('US4-7: un pago ya hecho se descuenta; queda pendiente lo que falta', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.createPayment(group, betoM, anaM, '100.00', beto);
    await f.recalc(group.id);

    const { body } = await view();
    expect(transfers(body.paid)).toEqual(['Beto→Ana 100.00']);
    expect(body.paid[0]).toMatchObject({ paid: true, paidBy: { id: beto.user.id, name: 'Beto' } });
    expect(body.paid[0].paidAt).not.toBeNull();
    expect(transfers(body.pending)).toEqual(['Beto→Ana 50.00']);
  });

  test('US4-8: si se pagó de más, la diferencia vuelve; pagadas + pendientes equilibran a todos', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    await f.createExpense(nafta, anaM, '120.00', ana);
    await f.createPayment(group, betoM, anaM, '100.00', beto);
    await f.recalc(group.id);

    const { body } = await view();
    expect(transfers(body.pending)).toEqual(['Ana→Beto 40.00']);
    expect(balanceOf(body, 'Beto')).toMatchObject({
      contributed: '0.00',
      share: '60.00',
      paymentsSent: '100.00',
      paymentsReceived: '0.00',
      pendingNet: '40.00',
    });
  });

  test('balances incluye a todos los miembros, suma cero y no incluye al dueño no miembro', async () => {
    const owner = await f.createUser('Olga');
    const other = await f.createGroup(owner, 'Casa');
    const m1 = await f.addMember(other, { user: ana });
    const m2 = await f.addMember(other, { alias: 'Zoe' });
    await f.addMember(other, { alias: 'Sin categorías' });
    const c = await f.createCategory(other, owner, 'Luz', [m1, m2]);
    await f.createExpense(c, m1, '80.00', owner);
    await f.recalc(other.id);

    const res = await request(app).get(`/groups/${other.id}/settlements`).set('Authorization', owner.auth);

    expect(res.status).toBe(200);
    expect(res.body.balances.map((b) => [b.displayName, b.pendingNet])).toEqual([
      ['Ana', '40.00'],
      ['Zoe', '-40.00'],
      ['Sin categorías', '0.00'],
    ]);
  });

  test('alguien sin acceso → 404', async () => {
    expect((await view(carla)).status).toBe(404);
  });
});
