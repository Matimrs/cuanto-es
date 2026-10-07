// Recálculo de liquidaciones (specs/002-groups-expenses-settlements, research R5, R6, R12).
// Toda operación que cambia el reparto corre dentro de withGroupLock y termina llamando a
// recalculatePending, en la misma transacción. Consultar las liquidaciones no escribe nada.
const prisma = require('../models/prisma');
const { byCreation, memberWithUser, paidByCategory } = require('../models/groupData');
const { computeSettlements, computeBalances } = require('../domain/settlements');
const { decimalToCents, centsToDecimalString, formatMoney } = require('../lib/money');
const { displayName, toSettlement } = require('../lib/serializers');

const TRANSACTION_OPTIONS = { maxWait: 10000, timeout: 20000 };

/**
 * Ejecuta fn(tx) en una transacción que bloquea la fila del grupo: dos cambios simultáneos del
 * mismo grupo se serializan y cada recálculo ve los datos del anterior (research R5).
 */
function withGroupLock(groupId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM groups WHERE id = ${groupId}::uuid FOR UPDATE`;
    return fn(tx);
  }, TRANSACTION_OPTIONS);
}

/** Entrada del cálculo en el orden determinista de research R4. */
async function loadCalculationInput(db, groupId) {
  const categories = await db.category.findMany({
    where: { groupId },
    select: { id: true, participants: { select: { memberId: true }, orderBy: byCreation } },
    orderBy: byCreation,
  });
  const paid = await paidByCategory(db, { groupId });
  const payments = await db.settlement.findMany({
    where: { groupId, paid: true },
    orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
  });

  return {
    categories: categories.map((c) => ({
      id: c.id,
      participants: c.participants.map((p) => ({
        memberId: p.memberId,
        paidCents: paid.get(c.id)?.get(p.memberId) ?? 0,
      })),
    })),
    payments: payments.map((s) => ({
      debtorId: s.debtorId,
      creditorId: s.creditorId,
      cents: decimalToCents(s.amount),
    })),
  };
}

/** Reemplaza las liquidaciones pendientes del grupo por un cálculo nuevo (FR-027). */
async function recalculatePending(tx, groupId) {
  await tx.settlement.deleteMany({ where: { groupId, paid: false } });
  const transfers = computeSettlements(await loadCalculationInput(tx, groupId));
  if (transfers.length === 0) return;
  await tx.settlement.createMany({
    data: transfers.map((t, position) => ({
      groupId,
      debtorId: t.debtorId,
      creditorId: t.creditorId,
      amount: centsToDecimalString(t.cents),
      position,
    })),
  });
}

const settlementInclude = {
  debtor: memberWithUser,
  creditor: memberWithUser,
  paidBy: { select: { id: true, name: true } },
};

/** Pendientes, pagadas y saldo de cada miembro (FR-027b). Solo lee. */
async function getSettlementsView(db, groupId) {
  const [pending, paid, members, input] = await Promise.all([
    db.settlement.findMany({
      where: { groupId, paid: false },
      include: settlementInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    }),
    db.settlement.findMany({
      where: { groupId, paid: true },
      include: settlementInclude,
      orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
    }),
    db.groupMember.findMany({ where: { groupId }, ...memberWithUser, orderBy: byCreation }),
    loadCalculationInput(db, groupId),
  ]);

  const balances = computeBalances({ ...input, memberIds: members.map((m) => m.id) });
  const byMember = new Map(balances.map((b) => [b.memberId, b]));

  return {
    pending: pending.map(toSettlement),
    paid: paid.map(toSettlement),
    balances: members.map((member) => {
      const b = byMember.get(member.id);
      return {
        memberId: member.id,
        displayName: displayName(member),
        contributed: formatMoney(b.contributed),
        share: formatMoney(b.share),
        paymentsSent: formatMoney(b.paymentsSent),
        paymentsReceived: formatMoney(b.paymentsReceived),
        pendingNet: formatMoney(b.pendingNet),
      };
    }),
  };
}

module.exports = { withGroupLock, loadCalculationInput, recalculatePending, getSettlementsView };
