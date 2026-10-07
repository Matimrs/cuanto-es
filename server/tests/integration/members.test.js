// US2 — Sumar miembros al grupo, con y sin cuenta (FR-008 a FR-012).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');
const f = require('../setup/factories');

const app = createApp();
let ana, beto, carla, group;

beforeEach(async () => {
  await resetDb();
  [ana, beto, carla] = await Promise.all(['Ana', 'Beto', 'Carla'].map(f.createUser));
  group = await f.createGroup(ana);
});
afterAll(disconnect);

const url = (path = '') => `/groups/${group.id}/members${path}`;
const as = (who) => ({
  get: (u) => request(app).get(u).set('Authorization', who.auth),
  post: (u, body) => request(app).post(u).set('Authorization', who.auth).send(body),
  patch: (u, body) => request(app).patch(u).set('Authorization', who.auth).send(body),
  delete: (u) => request(app).delete(u).set('Authorization', who.auth),
});

describe('POST /groups/:groupId/members', () => {
  test('US2-1: agrega a un usuario registrado por email normalizado y le da acceso', async () => {
    // Antes de agregarlo, Beto no tiene acceso al grupo
    expect((await as(beto).get(url())).status).toBe(404);

    const res = await as(ana).post(url(), { email: ' BETO@Ejemplo.com ' });

    expect(res.status).toBe(201);
    expect(res.body.member).toMatchObject({
      displayName: 'Beto',
      userId: beto.user.id,
      isGuest: false,
    });
    expect((await as(beto).get(url())).status).toBe(200);
  });

  test('US2-2: agrega un invitado con alias recortado', async () => {
    const res = await as(ana).post(url(), { alias: '  Dani ' });
    expect(res.status).toBe(201);
    expect(res.body.member).toMatchObject({ displayName: 'Dani', userId: null, isGuest: true });
  });

  test('US2-3: el mismo usuario dos veces → 409 ALREADY_MEMBER', async () => {
    await as(ana).post(url(), { email: 'beto@ejemplo.com' }).expect(201);
    const res = await as(ana).post(url(), { email: ' BETO@Ejemplo.com ' });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({
      code: 'ALREADY_MEMBER',
      message: 'Esa persona ya es miembro del grupo',
    });
  });

  test('US2-4: un email sin cuenta → 422 USER_NOT_FOUND sugiriendo invitado', async () => {
    const res = await as(ana).post(url(), { email: 'nadie@ejemplo.com' });
    expect(res.status).toBe(422);
    expect(res.body.error).toEqual({
      code: 'USER_NOT_FOUND',
      message: 'No hay ninguna cuenta con ese email. Podés agregarlo como invitado.',
    });
  });

  test('FR-009: alias repetido sin distinguir mayúsculas → 409 ALIAS_TAKEN', async () => {
    await as(ana).post(url(), { alias: 'Dani' }).expect(201);
    const res = await as(ana).post(url(), { alias: ' DANI' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALIAS_TAKEN');
  });

  test.each([
    ['email y alias a la vez', { email: 'beto@ejemplo.com', alias: 'Beto' }],
    ['ninguno de los dos', {}],
    ['email mal formado', { email: 'beto' }],
    ['alias vacío', { alias: '   ' }],
    ['alias de 101 caracteres', { alias: 'a'.repeat(101) }],
  ])('%s → 400', async (_caso, body) => {
    const res = await as(ana).post(url(), body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('US2-6: la dueña se agrega a sí misma como miembro', async () => {
    const res = await as(ana).post(url(), { email: 'ana@ejemplo.com' });
    expect(res.status).toBe(201);
    expect(res.body.member.userId).toBe(ana.user.id);
  });

  test('solo el dueño agrega miembros: un miembro → 403, un ajeno → 404', async () => {
    await f.addMember(group, { user: beto });
    expect((await as(beto).post(url(), { alias: 'Dani' })).status).toBe(403);
    expect((await as(carla).post(url(), { alias: 'Dani' })).status).toBe(404);
  });
});

describe('GET /groups/:groupId/members', () => {
  test('lista en orden de alta con el nombre visible', async () => {
    await f.addMember(group, { user: beto });
    await f.addMember(group, { alias: 'Dani' });
    const res = await as(ana).get(url());
    expect(res.status).toBe(200);
    expect(res.body.members.map((m) => m.displayName)).toEqual(['Beto', 'Dani']);
  });
});

describe('PATCH /groups/:groupId/members/:memberId', () => {
  test('el dueño corrige el alias de un invitado', async () => {
    const dani = await f.addMember(group, { alias: 'Dani' });
    const res = await as(ana).patch(url(`/${dani.id}`), { alias: ' Daniela ' });
    expect(res.status).toBe(200);
    expect(res.body.member.displayName).toBe('Daniela');
  });

  test('a un miembro con cuenta no se le pone alias → 400', async () => {
    const betoM = await f.addMember(group, { user: beto });
    expect((await as(ana).patch(url(`/${betoM.id}`), { alias: 'Bebo' })).status).toBe(400);
  });

  test('un miembro que no es dueño → 403', async () => {
    await f.addMember(group, { user: beto });
    const dani = await f.addMember(group, { alias: 'Dani' });
    expect((await as(beto).patch(url(`/${dani.id}`), { alias: 'X' })).status).toBe(403);
  });

  test('memberId que no es UUID → 404 (no 500); de otro grupo → 404', async () => {
    const other = await f.createGroup(ana, 'Casa');
    const ajeno = await f.addMember(other, { alias: 'Eva' });
    expect((await as(ana).patch(url('/abc'), { alias: 'X' })).status).toBe(404);
    expect((await as(ana).delete(url('/abc'))).status).toBe(404);
    expect((await as(ana).patch(url(`/${ajeno.id}`), { alias: 'X' })).status).toBe(404);
    expect((await as(ana).delete(url(`/${ajeno.id}`))).status).toBe(404);
  });
});

describe('DELETE /groups/:groupId/members/:memberId (FR-012)', () => {
  let anaM, dani, nafta;

  beforeEach(async () => {
    anaM = await f.addMember(group, { user: ana });
    dani = await f.addMember(group, { alias: 'Dani' });
    nafta = await f.createCategory(group, ana, 'Nafta', [anaM, dani]);
  });

  test('US2-5: con gastos → 409 MEMBER_HAS_EXPENSES', async () => {
    await f.createExpense(nafta, dani, '100.00', ana);
    const res = await as(ana).delete(url(`/${dani.id}`));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MEMBER_HAS_EXPENSES');
  });

  test('con un pago registrado → 409 MEMBER_HAS_PAYMENTS', async () => {
    await f.createPayment(group, dani, anaM, '10.00', ana);
    const res = await as(ana).delete(url(`/${dani.id}`));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MEMBER_HAS_PAYMENTS');
  });

  test('sin gastos ni pagos → 204, deja sus categorías y las pendientes se recalculan sin él', async () => {
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.recalc(group.id);
    expect(await prisma.settlement.count({ where: { debtorId: dani.id } })).toBe(1);

    const res = await as(ana).delete(url(`/${dani.id}`));

    expect(res.status).toBe(204);
    expect(await prisma.groupMember.count({ where: { id: dani.id } })).toBe(0);
    expect(await prisma.categoryParticipant.count({ where: { memberId: dani.id } })).toBe(0);
    // Ana queda sola en la categoría: no hay nada que liquidar
    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(0);
  });

  test('solo el dueño quita miembros → 403 para un miembro', async () => {
    await f.addMember(group, { user: beto });
    expect((await as(beto).delete(url(`/${dani.id}`))).status).toBe(403);
  });
});
