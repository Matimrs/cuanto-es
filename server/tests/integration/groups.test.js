// US1 — Crear y administrar mis grupos (FR-001 a FR-007).
const request = require('supertest');
const { createApp } = require('../../src/app');
const { prisma, resetDb, disconnect } = require('../setup/db');
const f = require('../setup/factories');

const app = createApp();
let ana, beto, carla;

beforeEach(async () => {
  await resetDb();
  [ana, beto, carla] = await Promise.all(['Ana', 'Beto', 'Carla'].map(f.createUser));
});
afterAll(disconnect);

const api = (who) => ({
  get: (url) => request(app).get(url).set('Authorization', who.auth),
  post: (url, body) => request(app).post(url).set('Authorization', who.auth).send(body),
  patch: (url, body) => request(app).patch(url).set('Authorization', who.auth).send(body),
  delete: (url) => request(app).delete(url).set('Authorization', who.auth),
});

describe('sin sesión (FR-001)', () => {
  test.each([
    ['get', '/groups'],
    ['post', '/groups'],
    ['get', '/groups/00000000-0000-0000-0000-000000000000'],
  ])('%s %s → 401', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('POST /groups', () => {
  test('US1-1: crea el grupo con el usuario como dueño', async () => {
    const res = await api(ana).post('/groups', { name: '  Viaje a Córdoba  ' });

    expect(res.status).toBe(201);
    expect(res.body.group).toMatchObject({
      name: 'Viaje a Córdoba',
      owner: { id: ana.user.id, name: 'Ana' },
      role: 'owner',
      memberCount: 0,
      members: [],
      categories: [],
    });
  });

  test.each([
    ['vacío', { name: '   ' }],
    ['de 101 caracteres', { name: 'a'.repeat(101) }],
    ['sin nombre', {}],
  ])('nombre %s → 400', async (_caso, body) => {
    const res = await api(ana).post('/groups', body);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.name).toBeDefined();
  });

  test('ignora los campos que el cliente no puede fijar (FR-029)', async () => {
    const res = await api(ana).post('/groups', {
      name: 'Viaje',
      ownerId: beto.user.id,
      id: '00000000-0000-0000-0000-000000000000',
    });
    expect(res.status).toBe(201);
    expect(res.body.group.owner.id).toBe(ana.user.id);
    expect(res.body.group.id).not.toBe('00000000-0000-0000-0000-000000000000');
  });
});

describe('GET /groups', () => {
  test('US1-2: cada uno ve solo los grupos de los que es dueño o miembro con cuenta', async () => {
    const viaje = await f.createGroup(ana, 'Viaje');
    const casa = await f.createGroup(carla, 'Casa');
    await f.addMember(casa, { user: beto });
    await f.addMember(casa, { alias: 'Dani' });

    const anaList = await api(ana).get('/groups');
    const betoList = await api(beto).get('/groups');

    expect(anaList.body.groups.map((g) => g.id)).toEqual([viaje.id]);
    expect(betoList.body.groups).toEqual([
      expect.objectContaining({
        id: casa.id,
        name: 'Casa',
        owner: { id: carla.user.id, name: 'Carla' },
        role: 'member',
        memberCount: 2,
      }),
    ]);
  });

  test('ordenados por fecha de creación, el más reciente primero', async () => {
    const primero = await f.createGroup(ana, 'Primero');
    const segundo = await f.createGroup(ana, 'Segundo');
    await prisma.group.update({ where: { id: primero.id }, data: { createdAt: new Date('2026-01-01') } });

    const res = await api(ana).get('/groups');
    expect(res.body.groups.map((g) => g.id)).toEqual([segundo.id, primero.id]);
  });
});

describe('GET /groups/:groupId', () => {
  test('detalle con miembros (nombre visible) y categorías con su total', async () => {
    const group = await f.createGroup(ana);
    const anaM = await f.addMember(group, { user: ana });
    const dani = await f.addMember(group, { alias: 'Dani' });
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, dani]);
    await f.createExpense(nafta, dani, '1500.50', ana);
    await f.createExpense(nafta, anaM, '100.00', ana);

    const res = await api(ana).get(`/groups/${group.id}`);

    expect(res.status).toBe(200);
    expect(res.body.group.members.map((m) => [m.displayName, m.isGuest])).toEqual([
      ['Ana', false],
      ['Dani', true],
    ]);
    expect(res.body.group.categories).toEqual([
      expect.objectContaining({ name: 'Nafta', total: '1600.50' }),
    ]);
    expect(res.body.group.memberCount).toBe(2);
  });

  test('US1-3: alguien sin acceso recibe 404 en todas las operaciones', async () => {
    const group = await f.createGroup(ana);
    for (const res of [
      await api(carla).get(`/groups/${group.id}`),
      await api(carla).patch(`/groups/${group.id}`, { name: 'Robado' }),
      await api(carla).delete(`/groups/${group.id}`),
      await api(carla).get(`/groups/${group.id}/categories`),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });

  test('un groupId inexistente o que no es UUID → 404, nunca 500', async () => {
    expect((await api(ana).get('/groups/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    expect((await api(ana).get('/groups/no-es-un-uuid')).status).toBe(404);
    expect((await api(ana).delete('/groups/123')).status).toBe(404);
  });
});

describe('PATCH /groups/:groupId', () => {
  test('el dueño lo renombra', async () => {
    const group = await f.createGroup(ana);
    const res = await api(ana).patch(`/groups/${group.id}`, { name: ' Viaje 2027 ' });
    expect(res.status).toBe(200);
    expect(res.body.group.name).toBe('Viaje 2027');
  });

  test('un miembro que no es dueño → 403', async () => {
    const group = await f.createGroup(ana);
    await f.addMember(group, { user: beto });
    const res = await api(beto).patch(`/groups/${group.id}`, { name: 'Otro' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /groups/:groupId', () => {
  test('US1-4: el dueño lo elimina con todo su contenido y desaparece de las listas', async () => {
    const group = await f.createGroup(ana);
    const anaM = await f.addMember(group, { user: ana });
    const betoM = await f.addMember(group, { user: beto });
    const nafta = await f.createCategory(group, ana, 'Nafta', [anaM, betoM]);
    await f.createExpense(nafta, anaM, '300.00', ana);
    await f.createPayment(group, betoM, anaM, '50.00', beto);
    await f.recalc(group.id);

    const res = await api(ana).delete(`/groups/${group.id}`);

    expect(res.status).toBe(204);
    expect((await api(beto).get('/groups')).body.groups).toEqual([]);
    expect(await prisma.expense.count()).toBe(0);
    expect(await prisma.settlement.count()).toBe(0);
  });

  test('US1-5: un miembro que no es dueño no puede eliminarlo → 403', async () => {
    const group = await f.createGroup(ana);
    await f.addMember(group, { user: beto });
    const res = await api(beto).delete(`/groups/${group.id}`);
    expect(res.status).toBe(403);
    expect(await prisma.group.count()).toBe(1);
  });
});
