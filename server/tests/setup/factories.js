// Fábricas de datos para los tests de la Fase 2: escriben directo en la base, así cada suite
// arma su escenario sin depender de los endpoints de otras historias.
const { prisma } = require('./db');
const { hashPassword } = require('../../src/lib/passwords');
const { signToken } = require('../../src/lib/tokens');
const { withGroupLock, recalculatePending } = require('../../src/services/settlements.service');

let passwordHash;

/** Usuario con cuenta y su token. Email: <nombre en minúsculas>@ejemplo.com */
async function createUser(name) {
  passwordHash ??= await hashPassword('secreta123');
  const user = await prisma.user.create({
    data: { name, email: `${name.toLowerCase()}@ejemplo.com`, passwordHash },
  });
  const token = signToken(user.id);
  return { user, token, auth: `Bearer ${token}` };
}

function createGroup(owner, name = 'Viaje') {
  return prisma.group.create({ data: { name, ownerId: owner.user.id } });
}

/** addMember(group, { user: createUser(...) }) o addMember(group, { alias: 'Dani' }) */
function addMember(group, { user, alias }) {
  return prisma.groupMember.create({
    data: user ? { groupId: group.id, userId: user.user.id } : { groupId: group.id, alias },
  });
}

/** Categoría con sus participantes, en el orden dado (define el orden de alta). */
async function createCategory(group, createdBy, name, members) {
  const category = await prisma.category.create({
    data: { groupId: group.id, name, createdById: createdBy.user.id },
  });
  for (const member of members) {
    await prisma.categoryParticipant.create({
      data: { categoryId: category.id, groupId: group.id, memberId: member.id },
    });
  }
  return category;
}

function createExpense(category, member, amount, createdBy, { date = '2026-10-05', description } = {}) {
  return prisma.expense.create({
    data: {
      groupId: category.groupId,
      categoryId: category.id,
      paidById: member.id,
      amount,
      date: new Date(date),
      description,
      createdById: createdBy.user.id,
    },
  });
}

/** Pago ya registrado (liquidación pagada). */
function createPayment(group, debtor, creditor, amount, paidBy) {
  return prisma.settlement.create({
    data: {
      groupId: group.id,
      debtorId: debtor.id,
      creditorId: creditor.id,
      amount,
      paid: true,
      paidAt: new Date(),
      paidById: paidBy.user.id,
    },
  });
}

function recalc(groupId) {
  return withGroupLock(groupId, (tx) => recalculatePending(tx, groupId));
}

module.exports = {
  createUser,
  createGroup,
  addMember,
  createCategory,
  createExpense,
  createPayment,
  recalc,
};
