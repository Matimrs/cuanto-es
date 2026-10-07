// US2 — Miembros con y sin cuenta (FR-008 a FR-012). Solo el dueño los gestiona (requireOwner).
const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { memberWithUser, byCreation } = require('../models/groupData');
const { toMember } = require('../lib/serializers');
const { withGroupLock, recalculatePending } = require('../services/settlements.service');

function notFound() {
  return new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado');
}

async function findMember(db, groupId, memberId) {
  const member = await db.groupMember.findFirst({ where: { id: memberId, groupId }, ...memberWithUser });
  if (!member) throw notFound();
  return member;
}

async function list(req, res) {
  const members = await prisma.groupMember.findMany({
    where: { groupId: req.group.id },
    ...memberWithUser,
    orderBy: byCreation,
  });
  res.json({ members: members.map(toMember) });
}

// Los duplicados (ALREADY_MEMBER, ALIAS_TAKEN) los traduce el errorHandler desde el P2002.
async function add(req, res) {
  const { email, alias } = req.body;
  let data;
  if (email !== undefined) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      throw new HttpError(
        422,
        'USER_NOT_FOUND',
        'No hay ninguna cuenta con ese email. Podés agregarlo como invitado.',
      );
    }
    data = { groupId: req.group.id, userId: user.id };
  } else {
    data = { groupId: req.group.id, alias };
  }
  const member = await prisma.groupMember.create({ data, ...memberWithUser });
  res.status(201).json({ member: toMember(member) });
}

async function updateAlias(req, res) {
  const member = await findMember(prisma, req.group.id, req.params.memberId);
  if (member.userId !== null) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', {
      alias: 'Solo los invitados sin cuenta tienen alias',
    });
  }
  const updated = await prisma.groupMember.update({
    where: { id: member.id },
    data: { alias: req.body.alias },
    ...memberWithUser,
  });
  res.json({ member: toMember(updated) });
}

// FR-012: solo sin gastos ni pagos registrados. Sus participaciones se borran en cascada y las
// pendientes se recalculan sin él.
async function remove(req, res) {
  const groupId = req.group.id;
  await withGroupLock(groupId, async (tx) => {
    const member = await findMember(tx, groupId, req.params.memberId);

    if ((await tx.expense.count({ where: { paidById: member.id } })) > 0) {
      throw new HttpError(
        409,
        'MEMBER_HAS_EXPENSES',
        'Este miembro pagó gastos del grupo. Primero eliminá o reasigná sus gastos.',
      );
    }
    const payments = await tx.settlement.count({
      where: { groupId, paid: true, OR: [{ debtorId: member.id }, { creditorId: member.id }] },
    });
    if (payments > 0) {
      throw new HttpError(
        409,
        'MEMBER_HAS_PAYMENTS',
        'Este miembro tiene pagos registrados en el grupo y no se puede quitar.',
      );
    }

    await tx.settlement.deleteMany({
      where: { groupId, paid: false, OR: [{ debtorId: member.id }, { creditorId: member.id }] },
    });
    await tx.groupMember.delete({ where: { id: member.id } });
    await recalculatePending(tx, groupId);
  });
  res.status(204).end();
}

module.exports = { list, add, updateAlias, remove };
