// US1 — Grupos (FR-004 a FR-007). El acceso y el rol los resuelve loadGroup.
const prisma = require('../models/prisma');
const { memberWithUser, byCreation, loadCategories } = require('../models/groupData');
const { toGroupSummary, toMember } = require('../lib/serializers');

const summaryInclude = {
  owner: { select: { id: true, name: true } },
  _count: { select: { members: true } },
};

async function groupDetail(db, groupId, userId) {
  const group = await db.group.findUnique({ where: { id: groupId }, include: summaryInclude });
  const members = await db.groupMember.findMany({
    where: { groupId },
    ...memberWithUser,
    orderBy: byCreation,
  });
  return {
    ...toGroupSummary(group, userId),
    members: members.map(toMember),
    categories: await loadCategories(db, groupId),
  };
}

async function list(req, res) {
  const userId = req.user.id;
  const groups = await prisma.group.findMany({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    include: summaryInclude,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
  res.json({ groups: groups.map((g) => toGroupSummary(g, userId)) });
}

async function create(req, res) {
  const group = await prisma.group.create({ data: { name: req.body.name, ownerId: req.user.id } });
  res.status(201).json({ group: await groupDetail(prisma, group.id, req.user.id) });
}

async function get(req, res) {
  res.json({ group: await groupDetail(prisma, req.group.id, req.user.id) });
}

async function rename(req, res) {
  await prisma.group.update({ where: { id: req.group.id }, data: { name: req.body.name } });
  res.json({ group: await groupDetail(prisma, req.group.id, req.user.id) });
}

// Las FK en cascada borran miembros, categorías, participantes, gastos y liquidaciones (FR-007).
async function remove(req, res) {
  await prisma.group.delete({ where: { id: req.group.id } });
  res.status(204).end();
}

module.exports = { list, create, get, rename, remove, groupDetail };
