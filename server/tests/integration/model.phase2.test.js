// Reglas de la base de la Fase 2 (data-model.md de la 002, research R7–R8, SC-006).
const { prisma, resetDb, disconnect } = require('../setup/db');
const {
  createUser,
  createGroup,
  addMember,
  createCategory,
  createExpense,
  createPayment,
} = require('../setup/factories');

let ana, beto, group, other, anaM, betoM, dani, nafta;

beforeEach(async () => {
  await resetDb();
  ana = await createUser('Ana');
  beto = await createUser('Beto');
  group = await createGroup(ana);
  other = await createGroup(ana, 'Casa');
  anaM = await addMember(group, { user: ana });
  betoM = await addMember(group, { user: beto });
  dani = await addMember(group, { alias: 'Dani' });
  nafta = await createCategory(group, ana, 'Nafta', [anaM, dani]);
});
afterAll(disconnect);

describe('participantes y gastos (FR-015a, FR-018)', () => {
  test('rechaza un gasto cuyo pagador no participa de la categoría', async () => {
    await expect(createExpense(nafta, betoM, '10.00', ana)).rejects.toMatchObject({ code: 'P2003' });
  });

  test('rechaza quitar un participante que tiene gastos', async () => {
    await createExpense(nafta, dani, '10.00', ana);
    await expect(
      prisma.categoryParticipant.delete({
        where: { categoryId_memberId: { categoryId: nafta.id, memberId: dani.id } },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  test('rechaza borrar un miembro que tiene gastos', async () => {
    await createExpense(nafta, dani, '10.00', ana);
    await expect(prisma.groupMember.delete({ where: { id: dani.id } })).rejects.toMatchObject({
      code: 'P2003',
    });
  });

  test('borrar un miembro sin gastos borra sus participaciones', async () => {
    await prisma.groupMember.delete({ where: { id: dani.id } });
    expect(await prisma.categoryParticipant.count({ where: { memberId: dani.id } })).toBe(0);
  });
});

describe('borrado en cascada (FR-007, FR-014)', () => {
  test('borrar una categoría borra sus participantes y gastos', async () => {
    await createExpense(nafta, dani, '10.00', ana);
    await createExpense(nafta, anaM, '20.00', ana);
    await prisma.category.delete({ where: { id: nafta.id } });
    expect(await prisma.expense.count()).toBe(0);
    expect(await prisma.categoryParticipant.count()).toBe(0);
  });

  test('borrar un grupo borra todo su contenido, incluidas las liquidaciones pagadas', async () => {
    await createExpense(nafta, dani, '10.00', ana);
    await createPayment(group, anaM, dani, '5.00', ana);
    await prisma.group.delete({ where: { id: group.id } });
    for (const model of ['groupMember', 'category', 'categoryParticipant', 'expense', 'settlement']) {
      expect(await prisma[model].count({ where: { groupId: group.id } })).toBe(0);
    }
  });
});

describe('unicidad sin distinguir mayúsculas (FR-009, FR-013)', () => {
  test('rechaza "nafta" si ya existe "Nafta" en el grupo', async () => {
    const err = await prisma.category
      .create({ data: { groupId: group.id, name: 'nafta', createdById: ana.user.id } })
      .catch((e) => e);
    expect(err).toMatchObject({ code: 'P2002' });
    // El errorHandler (T017) identifica el índice por el nombre o los campos que reporta Prisma
    expect(JSON.stringify(err.meta) + err.message).toMatch(/categories_group_name_ci|group_id/);
  });

  test('el mismo nombre se permite en otro grupo', async () => {
    await expect(
      prisma.category.create({ data: { groupId: other.id, name: 'NAFTA', createdById: ana.user.id } }),
    ).resolves.toBeDefined();
  });

  test('rechaza dos invitados "Dani" y "DANI" en el mismo grupo', async () => {
    const err = await addMember(group, { alias: 'DANI' }).catch((e) => e);
    expect(err).toMatchObject({ code: 'P2002' });
    expect(JSON.stringify(err.meta) + err.message).toMatch(/group_members_group_alias_ci|alias|group_id/);
  });

  test('un alias igual al de un miembro con cuenta no choca (el índice es solo de invitados)', async () => {
    await prisma.groupMember.update({ where: { id: betoM.id }, data: { alias: 'Dani' } });
    await expect(addMember(other, { alias: 'Dani' })).resolves.toBeDefined();
  });
});

describe('estado de pago (FR-028)', () => {
  test('rechaza una liquidación pagada sin fecha ni autor de pago', async () => {
    await expect(
      prisma.settlement.create({
        data: { groupId: group.id, debtorId: dani.id, creditorId: anaM.id, amount: '1.00', paid: true },
      }),
    ).rejects.toThrow(/settlements_paid_(at|by)_consistent/);
  });
});
