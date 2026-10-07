// SC-008: cada regla de integridad del modelo (FR-015 a FR-021) tiene al menos un caso que
// demuestra que la base rechaza el dato inválido. Se prueba contra las migraciones reales.
const { Prisma } = require('@prisma/client');
const { prisma, resetDb, disconnect } = require('../setup/db');

const TABLES = ['users', 'groups', 'group_members', 'categories', 'expenses', 'settlements'];
const TODAY = new Date('2026-10-07');

let owner, ana, group, otherGroup, anaMember, guest, otherMember, category, otherCategory;

async function createUser(name, email) {
  return prisma.user.create({ data: { name, email, passwordHash: '$2b$04$hashdeprueba' } });
}

function expense(data) {
  return prisma.expense.create({
    data: {
      groupId: group.id,
      categoryId: category.id,
      paidById: anaMember.id,
      amount: '100.00',
      date: TODAY,
      ...data,
    },
  });
}

function settlement(data) {
  return prisma.settlement.create({
    data: {
      groupId: group.id,
      creditorId: anaMember.id,
      debtorId: guest.id,
      amount: '50.00',
      ...data,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  owner = await createUser('Dueña', 'duena@ejemplo.com');
  ana = await createUser('Ana', 'ana@ejemplo.com');
  // La dueña NO es miembro de su grupo (FR-021).
  group = await prisma.group.create({ data: { name: 'Viaje', ownerId: owner.id } });
  otherGroup = await prisma.group.create({ data: { name: 'Casa', ownerId: owner.id } });
  anaMember = await prisma.groupMember.create({ data: { groupId: group.id, userId: ana.id } });
  guest = await prisma.groupMember.create({ data: { groupId: group.id, alias: 'Beto' } });
  otherMember = await prisma.groupMember.create({ data: { groupId: otherGroup.id, alias: 'Caro' } });
  category = await prisma.category.create({ data: { groupId: group.id, name: 'Nafta' } });
  otherCategory = await prisma.category.create({ data: { groupId: otherGroup.id, name: 'Súper' } });
});
afterAll(disconnect);

describe('FR-015: las seis entidades existen', () => {
  test('las tablas existen y quedan vacías tras el reset (US4, escenario 1)', async () => {
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const names = rows.map((r) => r.table_name);
    expect(names).toEqual(expect.arrayContaining(TABLES));

    await resetDb();
    for (const table of TABLES) {
      const [{ count }] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM ${table}`);
      expect(count).toBe(0);
    }
  });
});

describe('FR-016: miembros de grupo', () => {
  test('un invitado sin cuenta con alias puede pagar un gasto (US4, escenario 2)', async () => {
    const created = await expense({ paidById: guest.id });
    const stored = await prisma.expense.findUnique({ where: { id: created.id } });
    expect(stored.paidById).toBe(guest.id);
  });

  test('puede haber varios invitados en el mismo grupo', async () => {
    await expect(
      prisma.groupMember.create({ data: { groupId: group.id, alias: 'Dani' } }),
    ).resolves.toBeDefined();
  });

  test('rechaza un miembro sin cuenta y sin alias', async () => {
    await expect(prisma.groupMember.create({ data: { groupId: group.id } })).rejects.toThrow(
      /group_members_user_or_alias/,
    );
  });

  test('rechaza un miembro sin cuenta con alias en blanco', async () => {
    await expect(
      prisma.groupMember.create({ data: { groupId: group.id, alias: '   ' } }),
    ).rejects.toThrow(/group_members_user_or_alias/);
  });

  test('rechaza al mismo usuario dos veces en el mismo grupo', async () => {
    await expect(
      prisma.groupMember.create({ data: { groupId: group.id, userId: ana.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('FR-017: montos', () => {
  test('guarda 1234,56 exacto, sin errores de redondeo (US4, escenario 4)', async () => {
    const created = await expense({ amount: '1234.56' });
    const stored = await prisma.expense.findUnique({ where: { id: created.id } });
    expect(stored.amount).toBeInstanceOf(Prisma.Decimal);
    expect(stored.amount.toFixed(2)).toBe('1234.56');
  });

  test('0,1 + 0,2 se suman exactos en la base', async () => {
    await expense({ amount: '0.10' });
    await expense({ amount: '0.20' });
    const { _sum } = await prisma.expense.aggregate({ _sum: { amount: true } });
    expect(_sum.amount.toFixed(2)).toBe('0.30');
  });

  test.each(['0', '-10.00'])('rechaza un gasto con monto %s', async (amount) => {
    await expect(expense({ amount })).rejects.toThrow(/expenses_amount_positive/);
  });

  test('rechaza una liquidación con monto cero', async () => {
    await expect(settlement({ amount: '0' })).rejects.toThrow(/settlements_amount_positive/);
  });
});

describe('FR-018: liquidaciones', () => {
  test('por defecto queda pendiente (paid = false)', async () => {
    const created = await settlement({});
    expect(created.paid).toBe(false);
  });

  test('rechaza acreedor igual al deudor', async () => {
    await expect(settlement({ debtorId: anaMember.id })).rejects.toThrow(
      /settlements_distinct_members/,
    );
  });

  test('rechaza un deudor de otro grupo', async () => {
    await expect(settlement({ debtorId: otherMember.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  test('rechaza un acreedor de otro grupo', async () => {
    await expect(settlement({ creditorId: otherMember.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });
});

describe('FR-019: gastos dentro del mismo grupo', () => {
  test('rechaza un gasto con una categoría de otro grupo', async () => {
    await expect(expense({ categoryId: otherCategory.id })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  test('rechaza un gasto pagado por un miembro de otro grupo', async () => {
    await expect(expense({ paidById: otherMember.id })).rejects.toMatchObject({ code: 'P2003' });
  });
});

describe('FR-020: categorías', () => {
  test('rechaza un nombre repetido dentro del grupo', async () => {
    await expect(
      prisma.category.create({ data: { groupId: group.id, name: 'Nafta' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  test('el mismo nombre se permite en otro grupo', async () => {
    await expect(
      prisma.category.create({ data: { groupId: otherGroup.id, name: 'Nafta' } }),
    ).resolves.toBeDefined();
  });
});

describe('FR-021: propietario', () => {
  test('el dueño crea el grupo sin ser miembro', async () => {
    const members = await prisma.groupMember.findMany({
      where: { groupId: group.id, userId: owner.id },
    });
    expect(members).toHaveLength(0);
    expect(group.ownerId).toBe(owner.id);
  });

  test('la base rechaza un grupo sin dueño', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO groups (id, name) VALUES (gen_random_uuid(), 'Sin dueño')`,
    ).rejects.toThrow(/23502/); // not_null_violation en owner_id
  });

  test('el dueño no miembro no puede pagar un gasto ni figurar en una liquidación', async () => {
    // No existe un GroupMember del dueño en este grupo: su id de usuario no es un miembro.
    await expect(expense({ paidById: owner.id })).rejects.toMatchObject({ code: 'P2003' });
    await expect(settlement({ creditorId: owner.id })).rejects.toMatchObject({ code: 'P2003' });
  });
});
