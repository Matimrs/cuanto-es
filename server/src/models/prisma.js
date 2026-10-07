const { PrismaClient } = require('@prisma/client');

// Instancia única de PrismaClient para todo el proceso.
const prisma = new PrismaClient();

module.exports = prisma;
