const prisma = require('../../src/models/prisma');

async function assertTestDatabase() {
  const [{ current_database: name }] = await prisma.$queryRawUnsafe('SELECT current_database()');
  if (!name.endsWith('_test')) {
    // Guarda: nunca vaciar la base de desarrollo.
    throw new Error(`resetDb() se negó a vaciar la base "${name}": no termina en "_test"`);
  }
}

async function resetDb() {
  await assertTestDatabase();
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, groups, group_members, categories, expenses, settlements RESTART IDENTITY CASCADE',
  );
}

async function disconnect() {
  await prisma.$disconnect();
}

module.exports = { prisma, resetDb, disconnect };
