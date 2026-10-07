const prisma = require('../models/prisma');
const HttpError = require('../lib/httpError');
const { isUuid } = require('../lib/ids');

function notFound() {
  return new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado');
}

/**
 * Resuelve el grupo de la ruta y el rol del usuario (FR-002). Solo el dueño y los miembros con
 * cuenta tienen acceso; para cualquier otro usuario el grupo responde como inexistente (404).
 * Deja req.group, req.role ('owner' | 'member') y req.membership (su GroupMember o null).
 */
async function loadGroup(req, res, next) {
  const { groupId } = req.params;
  if (!isUuid(groupId)) return next(notFound());

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { where: { userId: req.user.id } } },
  });
  if (!group) return next(notFound());

  const membership = group.members[0] ?? null;
  const isOwner = group.ownerId === req.user.id;
  if (!isOwner && !membership) return next(notFound());

  req.group = group;
  req.role = isOwner ? 'owner' : 'member';
  req.membership = membership;
  return next();
}

function forbidden() {
  return new HttpError(403, 'FORBIDDEN', 'No tenés permiso para hacer esto');
}

/** Solo el dueño del grupo (FR-003). */
function requireOwner(req, res, next) {
  if (req.role !== 'owner') return next(forbidden());
  return next();
}

/** FR-003a: solo el dueño del grupo o quien creó el recurso lo modifica o elimina. */
function assertOwnerOrAuthor(req, createdById) {
  if (req.role !== 'owner' && createdById !== req.user.id) throw forbidden();
}

module.exports = { loadGroup, requireOwner, forbidden, assertOwnerOrAuthor };
