// US3 — Categorías y sus participantes (FR-003a, FR-013 a FR-015b).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');
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

const url = (path = '') => `/groups/${group.id}/categories${path}`;
const as = (who) => ({
  get: (u) => request(app).get(u).set('Authorization', who.auth),
  post: (u, body) => request(app).post(u).set('Authorization', who.auth).send(body),
  patch: (u, body) => request(app).patch(u).set('Authorization', who.auth).send(body),
  delete: (u) => request(app).delete(u).set('Authorization', who.auth),
});
const names = (category) => category.participants.map((p) => p.displayName);

describe('POST /groups/:groupId/categories', () => {
  test('US3-1: con participantes elegidos, en ese orden', async () => {
    const res = await as(ana).post(url(), { name: ' Nafta ', participantIds: [dani.id, anaM.id] });

    expect(res.status).toBe(201);
    expect(res.body.category).toMatchObject({
      name: 'Nafta',
      createdBy: { id: ana.user.id, name: 'Ana' },
      total: '0.00',
    });
    expect(names(res.body.category)).toEqual(['Dani', 'Ana']);
  });

  test('FR-015: sin participantes indicados, participan todos los miembros actuales', async () => {
    const res = await as(ana).post(url(), { name: 'Súper' });
    expect(names(res.body.category)).toEqual(['Ana', 'Beto', 'Dani']);
  });

  test('cualquier participante del grupo crea categorías (FR-003a)', async () => {
    expect((await as(beto).post(url(), { name: 'Súper' })).status).toBe(201);
  });

  test.each([
    ['lista vacía', () => ({ name: 'X', participantIds: [] })],
    ['id repetido', () => ({ name: 'X', participantIds: [anaM.id, anaM.id] })],
    ['id que no es UUID', () => ({ name: 'X', participantIds: ['abc'] })],
    ['id inexistente', () => ({ name: 'X', participantIds: ['00000000-0000-0000-0000-000000000000'] })],
    ['nombre vacío', () => ({ name: '  ' })],
  ])('%s → 400', async (_caso, body) => {
    const res = await as(ana).post(url(), body());
    expect(res.status).toBe(400);
  });

  test('un miembro de otro grupo como participante → 400', async () => {
    const other = await f.createGroup(ana, 'Casa');
    const eva = await f.addMember(other, { alias: 'Eva' });
    const res = await as(ana).post(url(), { name: 'X', participantIds: [eva.id] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.participantIds).toBeDefined();
  });

  test('US3-3: nombre repetido sin distinguir mayúsculas ni espacios → 409', async () => {
    await as(ana).post(url(), { name: 'Nafta' }).expect(201);
    const res = await as(beto).post(url(), { name: ' nafta ' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_NAME_TAKEN');
  });

  test('alguien sin acceso al grupo → 404', async () => {
    expect((await as(carla).post(url(), { name: 'X' })).status).toBe(404);
  });
});

describe('GET /groups/:groupId/categories', () => {
  test('lista con total y lo pagado por cada participante', async () => {
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, dani]);
    await f.createExpense(nafta, dani, '100.50', ana);
    await f.createExpense(nafta, dani, '50.00', ana);

    const res = await as(beto).get(url());

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([
      expect.objectContaining({
        name: 'Nafta',
        total: '150.50',
        participants: [
          { memberId: anaM.id, displayName: 'Ana', paid: '0.00' },
          { memberId: dani.id, displayName: 'Dani', paid: '150.50' },
        ],
      }),
    ]);
  });

  test('categoryId que no es UUID o de otro grupo → 404', async () => {
    const other = await f.createGroup(ana, 'Casa');
    const ajena = await f.createCategory(other, ana, 'Ajena', []);
    expect((await as(ana).get(url('/abc'))).status).toBe(404);
    expect((await as(ana).get(url(`/${ajena.id}`))).status).toBe(404);
  });
});

describe('modificar y eliminar (FR-003a, FR-014)', () => {
  let nafta;
  beforeEach(async () => {
    nafta = await f.createCategory(group, beto, 'Nafta', [anaM, betoM, dani]);
  });

  test('quien la creó la renombra; el dueño también', async () => {
    expect((await as(beto).patch(url(`/${nafta.id}`), { name: 'Combustible' })).body.category.name).toBe(
      'Combustible',
    );
    expect((await as(ana).patch(url(`/${nafta.id}`), { name: 'Nafta' })).status).toBe(200);
  });

  test('otro miembro que no la creó ni es dueño → 403', async () => {
    const carlaM = await f.addMember(group, { user: carla });
    expect(carlaM).toBeDefined();
    expect((await as(carla).patch(url(`/${nafta.id}`), { name: 'X' })).status).toBe(403);
    expect((await as(carla).delete(url(`/${nafta.id}`))).status).toBe(403);
    expect((await as(carla).post(url(`/${nafta.id}/participants`), { memberId: carlaM.id })).status).toBe(403);
  });

  test('US3-6: eliminarla borra sus gastos y participantes y recalcula las pendientes', async () => {
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);
    expect(await prisma.settlement.count()).toBe(2);

    const res = await as(beto).delete(url(`/${nafta.id}`));

    expect(res.status).toBe(204);
    expect(await prisma.expense.count()).toBe(0);
    expect(await prisma.categoryParticipant.count()).toBe(0);
    expect(await prisma.settlement.count()).toBe(0);
  });
});

describe('participantes (FR-015a, FR-015b)', () => {
  let nafta;
  beforeEach(async () => {
    nafta = await f.createCategory(group, ana, 'Nafta', [anaM, dani]);
  });

  test('US3-8: sumar a Beto lo hace entrar en el reparto aunque no haya pagado', async () => {
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);

    const res = await as(ana).post(url(`/${nafta.id}/participants`), { memberId: betoM.id });

    expect(res.status).toBe(201);
    expect(names(res.body.category)).toEqual(['Ana', 'Dani', 'Beto']);
    const pending = await prisma.settlement.findMany({ where: { paid: false } });
    expect(pending.map((s) => [s.debtorId, s.amount.toFixed(2)]).sort()).toEqual(
      [
        [betoM.id, '100.00'],
        [dani.id, '100.00'],
      ].sort(),
    );
  });

  test('sumarlo dos veces → 409 ALREADY_PARTICIPANT; un miembro de otro grupo → 400', async () => {
    const res = await as(ana).post(url(`/${nafta.id}/participants`), { memberId: dani.id });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PARTICIPANT');

    const other = await f.createGroup(ana, 'Casa');
    const eva = await f.addMember(other, { alias: 'Eva' });
    expect((await as(ana).post(url(`/${nafta.id}/participants`), { memberId: eva.id })).status).toBe(400);
  });

  test('quitar a quien pagó en la categoría → 409 PARTICIPANT_HAS_EXPENSES', async () => {
    await f.createExpense(nafta, dani, '10.00', ana);
    const res = await as(ana).delete(url(`/${nafta.id}/participants/${dani.id}`));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PARTICIPANT_HAS_EXPENSES');
  });

  test('quitar a uno sin gastos → 204 y recálculo; quitar al último → 400', async () => {
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);

    expect((await as(ana).delete(url(`/${nafta.id}/participants/${dani.id}`))).status).toBe(204);
    expect(await prisma.settlement.count()).toBe(0);

    const empty = await f.createCategory(group, ana, 'Sola', [betoM]);
    const res = await as(ana).delete(url(`/${empty.id}/participants/${betoM.id}`));
    expect(res.status).toBe(400);
  });

  test('memberId de participante que no es UUID o que no participa → 404', async () => {
    expect((await as(ana).delete(url(`/${nafta.id}/participants/abc`))).status).toBe(404);
    expect((await as(ana).delete(url(`/${nafta.id}/participants/${betoM.id}`))).status).toBe(404);
  });
});
