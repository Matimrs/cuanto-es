// US3 — Gastos individuales (FR-003a, FR-016 a FR-020). Cada cambio recalcula las pendientes.
const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { memberWithUser } = require('../models/groupData');
const { centsToDecimalString } = require('../lib/money');
const { toExpense } = require('../lib/serializers');
const { assertOwnerOrAuthor } = require('../middleware/loadGroup');
const { withGroupLock, recalculatePending } = require('../services/settlements.service');

const expenseInclude = {
  paidBy: memberWithUser,
  createdBy: { select: { id: true, name: true } },
};

function notFound() {
  return new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado');
}

function invalid(field, message) {
  return new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', { [field]: message });
}

async function findExpense(db, groupId, expenseId) {
  const expense = await db.expense.findFirst({ where: { id: expenseId, groupId }, include: expenseInclude });
  if (!expense) throw notFound();
  return expense;
}

// FR-018: quien pagó tiene que participar de la categoría (la base también lo garantiza).
async function assertPayerParticipates(db, categoryId, paidById) {
  const participant = await db.categoryParticipant.findUnique({
    where: { categoryId_memberId: { categoryId, memberId: paidById } },
  });
  if (!participant) throw invalid('paidById', 'Quien pagó tiene que participar de la categoría');
}

async function listByCategory(req, res) {
  const groupId = req.group.id;
  const category = await prisma.category.findFirst({ where: { id: req.params.categoryId, groupId } });
  if (!category) throw notFound();
  const expenses = await prisma.expense.findMany({
    where: { categoryId: category.id, groupId },
    include: expenseInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
  });
  res.json({ expenses: expenses.map(toExpense) });
}

async function get(req, res) {
  res.json({ expense: toExpense(await findExpense(prisma, req.group.id, req.params.expenseId)) });
}

async function create(req, res) {
  const groupId = req.group.id;
  const { paidById, amount, date, description = null } = req.body;

  const expense = await withGroupLock(groupId, async (tx) => {
    const category = await tx.category.findFirst({ where: { id: req.params.categoryId, groupId } });
    if (!category) throw notFound();
    await assertPayerParticipates(tx, category.id, paidById);

    const created = await tx.expense.create({
      data: {
        groupId,
        categoryId: category.id,
        paidById,
        amount: centsToDecimalString(amount),
        date,
        description,
        createdById: req.user.id,
      },
      include: expenseInclude,
    });
    await recalculatePending(tx, groupId);
    return created;
  });

  res.status(201).json({ expense: toExpense(expense) });
}

async function update(req, res) {
  const groupId = req.group.id;
  const changes = req.body;

  const expense = await withGroupLock(groupId, async (tx) => {
    const current = await findExpense(tx, groupId, req.params.expenseId);
    assertOwnerOrAuthor(req, current.createdById);

    const categoryId = changes.categoryId ?? current.categoryId;
    const paidById = changes.paidById ?? current.paidById;
    if (changes.categoryId) {
      const category = await tx.category.findFirst({ where: { id: categoryId, groupId } });
      if (!category) throw invalid('categoryId', 'La categoría no es de este grupo');
    }
    await assertPayerParticipates(tx, categoryId, paidById);

    const data = { categoryId, paidById };
    if (changes.amount !== undefined) data.amount = centsToDecimalString(changes.amount);
    if (changes.date !== undefined) data.date = changes.date;
    if (changes.description !== undefined) data.description = changes.description;

    const updated = await tx.expense.update({ where: { id: current.id }, data, include: expenseInclude });
    await recalculatePending(tx, groupId);
    return updated;
  });

  res.json({ expense: toExpense(expense) });
}

async function remove(req, res) {
  const groupId = req.group.id;
  await withGroupLock(groupId, async (tx) => {
    const expense = await findExpense(tx, groupId, req.params.expenseId);
    assertOwnerOrAuthor(req, expense.createdById);
    await tx.expense.delete({ where: { id: expense.id } });
    await recalculatePending(tx, groupId);
  });
  res.status(204).end();
}

module.exports = { listByCategory, get, create, update, remove };
