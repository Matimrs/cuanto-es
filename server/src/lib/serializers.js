// Forma de las respuestas de la API (contracts/groups-api.yaml de la 002). Los montos salen como
// string decimal con 2 decimales y las fechas de gasto como YYYY-MM-DD.
const { formatMoney, decimalToCents } = require('./money');

const userRef = (user) => (user ? { id: user.id, name: user.name } : null);

/** Nombre visible (FR-011): el de la cuenta, o el alias si es invitado. Requiere member.user. */
function displayName(member) {
  return member.user ? member.user.name : member.alias;
}

const memberRef = (member) => ({ id: member.id, displayName: displayName(member) });

function toMember(member) {
  return {
    id: member.id,
    displayName: displayName(member),
    userId: member.userId,
    isGuest: member.userId === null,
    createdAt: member.createdAt,
  };
}

/**
 * @param category con `createdBy` y `participants` (cada uno con `member.user`) en orden de alta
 * @param paidByMember Map memberId → centavos pagados en esta categoría
 */
function toCategory(category, paidByMember = new Map()) {
  const participants = category.participants.map((p) => ({
    memberId: p.memberId,
    displayName: displayName(p.member),
    paid: formatMoney(paidByMember.get(p.memberId) ?? 0),
  }));
  const total = [...paidByMember.values()].reduce((sum, cents) => sum + cents, 0);
  return {
    id: category.id,
    name: category.name,
    createdBy: userRef(category.createdBy),
    participants,
    total: formatMoney(total),
    createdAt: category.createdAt,
  };
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

/** @param expense con `paidBy.user` y `createdBy` */
function toExpense(expense) {
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    paidBy: memberRef(expense.paidBy),
    amount: formatMoney(decimalToCents(expense.amount)),
    date: toDateOnly(expense.date),
    description: expense.description,
    createdBy: userRef(expense.createdBy),
    createdAt: expense.createdAt,
  };
}

/** @param group con `owner` y `_count.members` */
function toGroupSummary(group, userId) {
  return {
    id: group.id,
    name: group.name,
    owner: userRef(group.owner),
    role: group.ownerId === userId ? 'owner' : 'member',
    memberCount: group._count.members,
    createdAt: group.createdAt,
  };
}

/** @param settlement con `debtor.user`, `creditor.user` y `paidBy` */
function toSettlement(settlement) {
  return {
    id: settlement.id,
    debtor: memberRef(settlement.debtor),
    creditor: memberRef(settlement.creditor),
    amount: formatMoney(decimalToCents(settlement.amount)),
    paid: settlement.paid,
    paidAt: settlement.paidAt,
    paidBy: userRef(settlement.paidBy),
  };
}

module.exports = {
  displayName,
  toMember,
  toCategory,
  toExpense,
  toGroupSummary,
  toSettlement,
  toDateOnly,
};
