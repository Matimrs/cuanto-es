// US5 — Registrar pagos totales o parciales y anularlos (FR-027c, FR-028, FR-028a).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');
const f = require('../setup/factories');

const app = createApp();
let ana, beto, carla, eva, group, anaM, betoM, dani, nafta;

beforeEach(async () => {
  await resetDb();
  [ana, beto, carla, eva] = await Promise.all(['Ana', 'Beto', 'Carla', 'Eva'].map(f.createUser));
  // Eva es la dueña y no es miembro; Ana, Beto y Carla son miembros con cuenta; Dani es invitado.
  group = await f.createGroup(eva);
  anaM = await f.addMember(group, { user: ana });
  betoM = await f.addMember(group, { user: beto });
  await f.addMember(group, { user: carla });
  dani = await f.addMember(group, { alias: 'Dani' });
  nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM, dani]);
  await f.createExpense(nafta, anaM, '300.00', ana);
  await f.recalc(group.id);
});
afterAll(disconnect);

async function pendingOf(debtor) {
  return prisma.settlement.findFirst({ where: { groupId: group.id, paid: false, debtorId: debtor.id } });
}
const patch = (who, settlementId, body) =>
  request(app)
    .patch(`/groups/${group.id}/settlements/${settlementId}`)
    .set('Authorization', who.auth)
    .send(body);
const transfers = (list) => list.map((s) => `${s.debtor.displayName}→${s.creditor.displayName} ${s.amount}`);

describe('registrar un pago (paid: true)', () => {
  test.each([
    ['el deudor', () => beto],
    ['el acreedor', () => ana],
    ['la dueña del grupo', () => eva],
  ])('US5-1: %s registra el pago total', async (_who, who) => {
    const settlement = await pendingOf(betoM);
    const res = await patch(who(), settlement.id, { paid: true });

    expect(res.status).toBe(200);
    expect(transfers(res.body.paid)).toEqual(['Beto→Ana 100.00']);
    expect(res.body.paid[0]).toMatchObject({ paidBy: { id: who().user.id } });
    expect(res.body.paid[0].paidAt).not.toBeNull();
    expect(transfers(res.body.pending)).toEqual(['Dani→Ana 100.00']);
  });

  test('US5-4: otro miembro con cuenta → 403, aunque puede verla', async () => {
    const settlement = await pendingOf(betoM);
    expect((await patch(carla, settlement.id, { paid: true })).status).toBe(403);
    expect(
      (await request(app).get(`/groups/${group.id}/settlements`).set('Authorization', carla.auth)).status,
    ).toBe(200);
  });

  test('US5-3: alguien sin acceso al grupo → 404', async () => {
    const intruso = await f.createUser('Intruso');
    const settlement = await pendingOf(betoM);
    expect((await patch(intruso, settlement.id, { paid: true })).status).toBe(404);
  });

  test('US5-5: la deuda de un invitado la registra el acreedor o la dueña', async () => {
    const settlement = await pendingOf(dani);
    const res = await patch(ana, settlement.id, { paid: true });
    expect(res.status).toBe(200);
    expect(transfers(res.body.paid)).toEqual(['Dani→Ana 100.00']);
  });

  test('US5-7: pago parcial de 60 → pagada por 60 y pendiente nueva por 40', async () => {
    const settlement = await pendingOf(betoM);
    const res = await patch(beto, settlement.id, { paid: true, amount: '60' });

    expect(res.status).toBe(200);
    expect(transfers(res.body.paid)).toEqual(['Beto→Ana 60.00']);
    expect(transfers(res.body.pending)).toEqual(['Beto→Ana 40.00', 'Dani→Ana 100.00']);
  });

  test.each(['120', '0', '1.001', 'abc'])('US5-8: monto %p → 400', async (amount) => {
    const settlement = await pendingOf(betoM);
    const res = await patch(beto, settlement.id, { paid: true, amount });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.amount).toBeDefined();
  });

  test('US5-6: una pendiente reemplazada por un recálculo → 409 SETTLEMENT_CHANGED', async () => {
    const old = await pendingOf(betoM);
    await f.createExpense(nafta, betoM, '30.00', beto);
    await f.recalc(group.id);

    const res = await patch(beto, old.id, { paid: true });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'SETTLEMENT_CHANGED',
      message: 'Las liquidaciones cambiaron. Volvé a consultarlas.',
    });
  });

  test('pagar una ya pagada → 409 SETTLEMENT_ALREADY_PAID', async () => {
    const settlement = await pendingOf(betoM);
    await patch(beto, settlement.id, { paid: true }).expect(200);
    const res = await patch(beto, settlement.id, { paid: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SETTLEMENT_ALREADY_PAID');
  });

  test('settlementId que no es UUID → 404 (no 500)', async () => {
    expect((await patch(beto, 'abc', { paid: true })).status).toBe(404);
  });
});

describe('volver a pendiente (paid: false)', () => {
  test('US5-2/US5-9: anular un pago parcial vuelve a la pendiente original', async () => {
    const settlement = await pendingOf(betoM);
    const partial = await patch(beto, settlement.id, { paid: true, amount: '60' });
    const paidId = partial.body.paid[0].id;

    const res = await patch(ana, paidId, { paid: false });

    expect(res.status).toBe(200);
    expect(res.body.paid).toEqual([]);
    expect(transfers(res.body.pending)).toEqual(['Beto→Ana 100.00', 'Dani→Ana 100.00']);
  });

  test('sobre una pendiente → 400; con monto → 400; sin `paid` → 400', async () => {
    const settlement = await pendingOf(betoM);
    expect((await patch(beto, settlement.id, { paid: false })).status).toBe(400);
    expect((await patch(beto, settlement.id, { paid: false, amount: '10' })).status).toBe(400);
    expect((await patch(beto, settlement.id, {})).status).toBe(400);
  });

  test('solo deudor, acreedor o dueña: otro miembro → 403', async () => {
    const settlement = await pendingOf(betoM);
    const paid = await patch(beto, settlement.id, { paid: true });
    expect((await patch(carla, paid.body.paid[0].id, { paid: false })).status).toBe(403);
  });
});
