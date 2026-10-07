// Consultas de lectura que comparten varios controladores (acceso a datos, Principio II).
// Reciben `db`: el cliente de Prisma o una transacción.
const { decimalToCents } = require('../lib/money');
const { toCategory } = require('../lib/serializers');

const memberWithUser = { include: { user: { select: { id: true, name: true } } } };
const byCreation = [{ createdAt: 'asc' }, { id: 'asc' }];

const categoryInclude = {
  createdBy: { select: { id: true, name: true } },
  participants: { include: { member: memberWithUser }, orderBy: byCreation },
};

/** Map categoryId → Map memberId → centavos pagados, para las categorías dadas. */
async function paidByCategory(db, where) {
  const rows = await db.expense.groupBy({
    by: ['categoryId', 'paidById'],
    where,
    _sum: { amount: true },
  });
  const result = new Map();
  for (const row of rows) {
    if (!result.has(row.categoryId)) result.set(row.categoryId, new Map());
    result.get(row.categoryId).set(row.paidById, decimalToCents(row._sum.amount));
  }
  return result;
}

/** Categorías del grupo serializadas, con participantes y lo pagado por cada uno. */
async function loadCategories(db, groupId) {
  const categories = await db.category.findMany({
    where: { groupId },
    include: categoryInclude,
    orderBy: byCreation,
  });
  const paid = await paidByCategory(db, { groupId });
  return categories.map((c) => toCategory(c, paid.get(c.id)));
}

/** Una categoría serializada, o null si no existe en el grupo. */
async function loadCategory(db, groupId, categoryId) {
  const category = await db.category.findFirst({
    where: { id: categoryId, groupId },
    include: categoryInclude,
  });
  if (!category) return null;
  const paid = await paidByCategory(db, { groupId, categoryId });
  return toCategory(category, paid.get(category.id));
}

module.exports = { memberWithUser, byCreation, categoryInclude, paidByCategory, loadCategories, loadCategory };
