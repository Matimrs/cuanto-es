// Rutas de la Fase 2 (contracts/groups-api.yaml de la 002). Todo exige sesión (FR-001) y todo lo
// que cuelga de /:groupId pasa por loadGroup: sin acceso al grupo → 404 (FR-002).
const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const validateIdParam = require('../middleware/validateIdParam');
const { loadGroup, requireOwner } = require('../middleware/loadGroup');
const { groupInputSchema } = require('../schemas/groups.schemas');
const { addMemberSchema, updateAliasSchema } = require('../schemas/members.schemas');
const {
  createCategorySchema,
  renameCategorySchema,
  addParticipantSchema,
} = require('../schemas/categories.schemas');
const { createExpenseSchema, updateExpenseSchema } = require('../schemas/expenses.schemas');
const { updateSettlementSchema } = require('../schemas/settlements.schemas');
const groups = require('../controllers/groups.controller');
const members = require('../controllers/members.controller');
const categories = require('../controllers/categories.controller');
const expenses = require('../controllers/expenses.controller');
const settlements = require('../controllers/settlements.controller');

const ID_PARAMS = ['groupId', 'memberId', 'categoryId', 'expenseId', 'settlementId'];

const router = Router();
router.use(requireAuth);
router.param('groupId', validateIdParam);

router.get('/', groups.list);
router.post('/', validate(groupInputSchema), groups.create);

// Rutas de un grupo: el subrouter recibe groupId (mergeParams) y valida sus propios ids, porque
// router.param no se hereda entre routers.
const group = Router({ mergeParams: true });
for (const param of ID_PARAMS) group.param(param, validateIdParam);
group.use(loadGroup);

// US1 — grupo
group.get('/', groups.get);
group.patch('/', requireOwner, validate(groupInputSchema), groups.rename);
group.delete('/', requireOwner, groups.remove);

// US2 — miembros
group.get('/members', members.list);
group.post('/members', requireOwner, validate(addMemberSchema), members.add);
group.patch('/members/:memberId', requireOwner, validate(updateAliasSchema), members.updateAlias);
group.delete('/members/:memberId', requireOwner, members.remove);

// US3 — categorías, participantes y gastos (los permisos de autor se verifican en el controlador)
group.get('/categories', categories.list);
group.post('/categories', validate(createCategorySchema), categories.create);
group.get('/categories/:categoryId', categories.get);
group.patch('/categories/:categoryId', validate(renameCategorySchema), categories.rename);
group.delete('/categories/:categoryId', categories.remove);
group.post(
  '/categories/:categoryId/participants',
  validate(addParticipantSchema),
  categories.addParticipant,
);
group.delete('/categories/:categoryId/participants/:memberId', categories.removeParticipant);
group.get('/categories/:categoryId/expenses', expenses.listByCategory);
group.post('/categories/:categoryId/expenses', validate(createExpenseSchema), expenses.create);
group.get('/expenses/:expenseId', expenses.get);
group.patch('/expenses/:expenseId', validate(updateExpenseSchema), expenses.update);
group.delete('/expenses/:expenseId', expenses.remove);

// US4 / US5 — liquidaciones y pagos
group.get('/settlements', settlements.getView);
group.patch('/settlements/:settlementId', validate(updateSettlementSchema), settlements.update);

router.use('/:groupId', group);

module.exports = { router };
