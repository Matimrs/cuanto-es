// US3 — Categorías y participantes (FR-003a, FR-013 a FR-015b).
const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { byCreation, loadCategories, loadCategory } = require('../models/groupData');
const { assertOwnerOrAuthor } = require('../middleware/loadGroup');
const { withGroupLock, recalculatePending } = require('../services/settlements.service');

function notFound() {
  return new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado');
}

function invalid(field, message) {
  return new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', { [field]: message });
}

async function findCategory(db, groupId, categoryId) {
  const category = await db.category.findFirst({ where: { id: categoryId, groupId } });
  if (!category) throw notFound();
  return category;
}

async function list(req, res) {
  res.json({ categories: await loadCategories(prisma, req.group.id) });
}

async function get(req, res) {
  const category = await loadCategory(prisma, req.group.id, req.params.categoryId);
  if (!category) throw notFound();
  res.json({ category });
}

// FR-015: los participantes indicados, en ese orden; si no se indican, todos los miembros.
async function create(req, res) {
  const groupId = req.group.id;
  const { name, participantIds } = req.body;

  const categoryId = await withGroupLock(groupId, async (tx) => {
    let memberIds;
    if (participantIds) {
      const found = await tx.groupMember.count({ where: { groupId, id: { in: participantIds } } });
      if (found !== participantIds.length) {
        throw invalid('participantIds', 'Todos los participantes tienen que ser miembros del grupo');
      }
      memberIds = participantIds;
    } else {
      const members = await tx.groupMember.findMany({ where: { groupId }, orderBy: byCreation });
      if (members.length === 0) {
        throw invalid('participantIds', 'El grupo todavía no tiene miembros para participar');
      }
      memberIds = members.map((m) => m.id);
    }

    const category = await tx.category.create({
      data: { groupId, name, createdById: req.user.id },
    });
    // Dentro de una transacción now() es constante: el orden de alta se fija explícitamente.
    const start = Date.now();
    await tx.categoryParticipant.createMany({
      data: memberIds.map((memberId, i) => ({
        categoryId: category.id,
        groupId,
        memberId,
        createdAt: new Date(start + i),
      })),
    });
    await recalculatePending(tx, groupId);
    return category.id;
  });

  res.status(201).json({ category: await loadCategory(prisma, groupId, categoryId) });
}

async function rename(req, res) {
  const category = await findCategory(prisma, req.group.id, req.params.categoryId);
  assertOwnerOrAuthor(req, category.createdById);
  await prisma.category.update({ where: { id: category.id }, data: { name: req.body.name } });
  res.json({ category: await loadCategory(prisma, req.group.id, category.id) });
}

// FR-014: la cascada borra sus participantes y gastos; luego se recalcula.
async function remove(req, res) {
  const groupId = req.group.id;
  await withGroupLock(groupId, async (tx) => {
    const category = await findCategory(tx, groupId, req.params.categoryId);
    assertOwnerOrAuthor(req, category.createdById);
    await tx.category.delete({ where: { id: category.id } });
    await recalculatePending(tx, groupId);
  });
  res.status(204).end();
}

// FR-015a. El duplicado (ALREADY_PARTICIPANT) lo traduce el errorHandler desde el P2002.
async function addParticipant(req, res) {
  const groupId = req.group.id;
  const { categoryId } = req.params;
  await withGroupLock(groupId, async (tx) => {
    const category = await findCategory(tx, groupId, categoryId);
    assertOwnerOrAuthor(req, category.createdById);
    const member = await tx.groupMember.findFirst({ where: { id: req.body.memberId, groupId } });
    if (!member) throw invalid('memberId', 'El participante tiene que ser miembro del grupo');
    await tx.categoryParticipant.create({ data: { categoryId, groupId, memberId: member.id } });
    await recalculatePending(tx, groupId);
  });
  res.status(201).json({ category: await loadCategory(prisma, groupId, categoryId) });
}

// FR-015a: no se puede quitar a quien pagó en la categoría ni dejarla sin participantes.
async function removeParticipant(req, res) {
  const groupId = req.group.id;
  const { categoryId, memberId } = req.params;
  await withGroupLock(groupId, async (tx) => {
    const category = await findCategory(tx, groupId, categoryId);
    assertOwnerOrAuthor(req, category.createdById);
    const participant = await tx.categoryParticipant.findUnique({
      where: { categoryId_memberId: { categoryId, memberId } },
    });
    if (!participant) throw notFound();

    if ((await tx.expense.count({ where: { categoryId, paidById: memberId } })) > 0) {
      throw new HttpError(409, 'PARTICIPANT_HAS_EXPENSES', 'Este participante pagó gastos en la categoría');
    }
    if ((await tx.categoryParticipant.count({ where: { categoryId } })) === 1) {
      throw invalid('memberId', 'La categoría tiene que tener al menos un participante');
    }
    await tx.categoryParticipant.delete({ where: { id: participant.id } });
    await recalculatePending(tx, groupId);
  });
  res.status(204).end();
}

module.exports = { list, get, create, rename, remove, addParticipant, removeParticipant };
