---

description: "Lista de tareas para implementar grupos, gastos y liquidaciones en el servidor (Fase 2)"
---

# Tasks: Grupos, gastos y liquidaciones en el servidor (Fase 2)

**Input**: Documentos de diseño en `/specs/002-groups-expenses-settlements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/groups-api.yaml, quickstart.md

**Tests**: SE INCLUYEN. SC-006 exige un caso de prueba por cada regla de validación y de permisos,
SC-001/SC-002/SC-007 exigen probar el cálculo, y el Principio III exige pruebas de las invariantes
del reparto. Los tests de cada historia se escriben primero y deben FALLAR antes de implementar.

**Organization**: tareas agrupadas por historia de usuario. Las historias se prueban de forma
independiente creando sus datos de partida directamente en la base con las fábricas de T019.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US5)
- Rutas relativas a la raíz del repositorio. Backend en `server/`; dominio compartido en
  `src/classes` y `src/utils` (SPA).

## Convenciones comunes (aplican a todas las tareas)

- Las de la Fase 1 siguen vigentes: CommonJS, Express 5, formato de error
  `{ error: { code, message, fields? } }`, mensajes en castellano rioplatense, nunca loguear
  cuerpos de solicitud.
- **Montos**: en la API, string con 2 decimales (`"15000.50"`); internamente, **centavos
  enteros** vía `server/src/lib/money.js`. Nunca usar `Number(amount)` sobre un monto.
- **Acceso**: toda ruta bajo `/groups/:groupId` pasa por `requireAuth` y `loadGroup`. Sin
  acceso → 404 `NOT_FOUND`. Con acceso y sin permiso → 403 `FORBIDDEN` ("No tenés permiso para
  hacer esto"). Toda consulta Prisma de recursos del grupo filtra por `groupId: req.group.id`.
- **Recálculo**: toda operación que cambia el reparto (gastos, participantes, categorías,
  miembros, pagos) corre dentro de `withGroupLock(groupId, async (tx) => { …; await
  recalculatePending(tx, groupId) })` de `server/src/services/settlements.service.js`.
- **Nombre visible de un miembro**: `user.name` si tiene cuenta; si no, `alias`.
- **Códigos de error nuevos** (contrato): `FORBIDDEN`, `ALREADY_MEMBER`, `ALIAS_TAKEN`,
  `USER_NOT_FOUND` (422), `CATEGORY_NAME_TAKEN`, `ALREADY_PARTICIPANT`,
  `PARTICIPANT_HAS_EXPENSES`, `MEMBER_HAS_EXPENSES`, `MEMBER_HAS_PAYMENTS`,
  `SETTLEMENT_CHANGED`, `SETTLEMENT_ALREADY_PAID` (todos 409 salvo indicación).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: habilitar que el servidor cargue el dominio del cliente y subir a Node 24
(research R1, R9, R10).

- [X] T001 Agregar la extensión `.js` a los imports relativos del dominio del cliente, sin cambiar ninguna otra línea: en `src/classes/Category.js` (`"../utils/idGenerator"` → `"../utils/idGenerator.js"`, `"./Peer"` → `"./Peer.js"`) y en `src/utils/calculate.js` (`"../classes/Peer"` → `"../classes/Peer.js"`); `src/classes/Person.js` ya la tiene. Verificar con `npm run build` en la raíz que compila sin advertencias nuevas (las 3 de `no-unused-vars` ya existían)
- [X] T002 Modificar `server/package.json`: `"engines": { "node": ">=24" }`, agregar la dependencia `"uuid": "10.0.0"` (la misma versión que usa la SPA; la necesita `src/classes/Peer.js` dentro de Docker) y cambiar el script `test` a `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand`; correr `npm install` en `server/`
- [X] T003 [P] Modificar `server/Dockerfile` (research R10): `FROM node:24-alpine`, `WORKDIR /repo/server`, copiar `server/package*.json` y `server/prisma/`, `npm ci --omit=dev && npx prisma generate`, copiar `server/src/`, copiar `src/classes/` y `src/utils/` a `/repo/src/classes/` y `/repo/src/utils/`, `RUN ln -s /repo/server/node_modules /repo/node_modules` (para que `Peer.js` resuelva `uuid`); mantener `EXPOSE 3001` y el `CMD` de la Fase 1. Todas las rutas de `COPY` pasan a ser relativas a la raíz del repo
- [X] T004 [P] Modificar `docker-compose.yml`: en `api`, reemplazar `build: ./server` por `build: { context: ., dockerfile: server/Dockerfile }`; y crear `.dockerignore` en la raíz que excluya todo (`*`) salvo `server/package.json`, `server/package-lock.json`, `server/prisma/`, `server/src/`, `src/classes/` y `src/utils/` (patrones `!…`), para no enviar `node_modules`, `build`, `.git` ni `server/.env` al build
- [X] T005 [P] Actualizar la documentación de la Fase 1 al nuevo requisito: en `README.md` (sección "Backend (server/)") y en `specs/001-backend-auth-base/quickstart.md`, "Node.js 22" → "Node.js 24", y agregar que antes de `npm test` en `server/` hay que correr `npm install` también en la raíz (el cálculo usa `src/utils/calculate.js`, que importa `uuid` desde el `node_modules` de la raíz)
- [X] T006 Verificar la base: con `db` levantado, `npm test` en `server/` sigue pasando las 82 pruebas de la Fase 1 con Node 24 y el script nuevo

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: modelo de la Fase 2, cálculo reutilizado, recálculo transaccional, acceso a grupos
y fábricas de test. Todas las historias dependen de esta fase.

**⚠️ CRITICAL**: no se puede empezar ninguna historia hasta terminar esta fase.

### Modelo y migración

- [X] T007 Modificar `server/prisma/schema.prisma` según `data-model.md`: modelo nuevo `CategoryParticipant` (`@@map("category_participants")`, campos `id`, `categoryId`, `groupId`, `memberId`, `createdAt`; relaciones `category` con `fields: [categoryId, groupId], references: [id, groupId], onDelete: Cascade`, `member` con `fields: [memberId, groupId], references: [id, groupId], onDelete: Cascade`, `group` con `onDelete: Cascade`; `@@unique([categoryId, memberId])`); en `Category`: `createdById` (FK `users`, `onDelete: Restrict`), relación `participants`, y **quitar** `@@unique([groupId, name])`; en `Expense`: `createdById` (FK `users`), relación `participant CategoryParticipant @relation(fields: [categoryId, paidById], references: [categoryId, memberId], onDelete: NoAction)`, `@@index([groupId])`; en `Settlement`: `paidAt DateTime? @db.Timestamptz`, `paidById String? @db.Uuid` (FK `users`), `position Int @default(0)`, `@@index([groupId, paid])`; en `User`: relaciones inversas `categoriesCreated`, `expensesCreated`, `paymentsMarked`. `onDelete`: todas las relaciones hacia `Group` pasan a `Cascade`; `Expense.category` → `Cascade`; `Expense.paidBy`, `Settlement.creditor` y `Settlement.debtor` → `NoAction`; las relaciones hacia `User` quedan en `Restrict`
- [X] T008 Generar la migración con `npx prisma migrate dev --name groups_expenses_settlements --create-only` (con `db` levantado y `DB_HOST_PORT` si corresponde) y agregar al final de `server/prisma/migrations/<timestamp>_groups_expenses_settlements/migration.sql`, a mano: `CREATE UNIQUE INDEX "categories_group_name_ci" ON "categories" ("group_id", lower("name"));`, `CREATE UNIQUE INDEX "group_members_group_alias_ci" ON "group_members" ("group_id", lower("alias")) WHERE "user_id" IS NULL;`, `ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_at_consistent" CHECK ("paid" = ("paid_at" IS NOT NULL));` y `ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_by_consistent" CHECK ("paid" = ("paid_by_id" IS NOT NULL));`. Revisar que el SQL generado agregue `created_by_id` como `NOT NULL` sin fallar (las tablas `categories` y `expenses` están vacías en todos los entornos). Aplicar con `npx prisma migrate dev` y versionar la carpeta. No editar la migración `init` (FR-022 de la Fase 1)
- [X] T009 Modificar `server/tests/setup/db.js`: agregar `category_participants` a la lista del `TRUNCATE`

### Dinero y cálculo (dominio)

- [X] T010 [P] Tests primero en `server/tests/unit/money.test.js` para `server/src/lib/money.js`: `parseMoney` acepta `"15000.50"`, `"300"`, `300`, `15000.5` y devuelve centavos enteros (`1500050`, `30000`, …); rechaza (lanza o devuelve `null`) `"1.234"`, `0.001`, `"-5"`, `"abc"`, `"10000000000.00"` (> 9.999.999.999,99) y `NaN`; `formatMoney(1500050) === "15000.50"`, `formatMoney(5) === "0.05"`, `formatMoney(-4000) === "-40.00"`; `decimalToCents(new Prisma.Decimal("1234.56")) === 123456`
- [X] T011 [P] Implementar `server/src/lib/money.js`: `MONEY_RE = /^\d{1,10}(\.\d{1,2})?$/`; `parseMoney(value)` acepta string o number (con number usar `String(value)` y validar contra la regex; rechazar exponentes), convierte a centavos con aritmética de strings (parte entera × 100 + decimales completados a 2), sin `parseFloat`; `formatMoney(cents)` con signo; `decimalToCents(decimal)` vía `decimal.toFixed(2)` y la misma conversión; `centsToDecimalString(cents)` para escribir en Prisma
- [X] T012 [P] Tests primero en `server/tests/unit/settlements.domain.test.js` para `server/src/domain/settlements.js`. **(a) Escenarios de la spec**: US4-1 (300 entre Ana, Beto y Dani → Beto→Ana 10000, Dani→Ana 10000); US4-2 (unificación entre dos categorías); US4-3 (cadena A→B→C se simplifica sin cambiar saldos); US4-4/FR-024a (100 entre 3 → 3333 + 3333, Ana absorbe el centavo; con empate en lo pagado, lo absorbe el primero en orden de alta); US4-5 (todo equilibrado o sin gastos → `[]`); US4-7 (pago de 10000 ya hecho + deuda de 15000 → pendiente 5000); US4-8 (pago de 10000 con deuda de 6000 → la diferencia de 4000 vuelve al deudor, posiblemente redirigida por la eliminación de cadenas, conservando saldos); FR-015b (participante con 0 cuenta en el promedio). **(b) Equivalencia con la app (SC-001)**: al menos 10 escenarios (un participante, gastos iguales, 100/3, 1/7, miembros en varias categorías, invitados, cadenas de 3 y 4, unificación en ambos sentidos, categoría con un solo pagador entre 5). Para cada uno, armar la entrada como la app (`new Category`, `addPerson({id,name}, pesosFloat)`) y correr `calculate` de `src/utils/calculate.js`; comparar contra `computeSettlements` por pares (deudor, acreedor) con montos `Math.round(amount*100)`, descartando las transferencias de la app de menos de 1 centavo. **(c) Propiedades** con generador pseudoaleatorio de semilla fija (≥ 2000 grupos de 2–8 miembros, 1–4 categorías, 0–3 pagos): termina, todos los montos son enteros > 0, ningún deudor = acreedor y, para cada miembro, `Σ recibido − Σ pagado` de las transferencias = su `pendingNet` (SC-002, SC-007). **(d) Determinismo**: la misma entrada dos veces da el mismo array (FR-025). **(e) Saldos**: `computeBalances` devuelve `contributed`, `share`, `paymentsSent`, `paymentsReceived` y `pendingNet = contributed − share + paymentsSent − paymentsReceived`, que suman 0 en el grupo
- [X] T013 Implementar `server/src/domain/settlements.js` (research R1–R4), sin Prisma ni Express: `const Category = require('../../../src/classes/Category.js').default` y `const { calculate } = require('../../../src/utils/calculate.js')`. Exportar `computeShares(participants)`: recibe `[{ memberId, paidCents }]` en orden de alta; `base = Math.floor(total / n)`, `rest = total − base·n`, el resto se suma a quien más pagó (empate: el primero). Exportar `computeSettlements({ categories, payments })`, donde `categories = [{ id, participants: [{ memberId, paidCents }] }]` ya ordenadas y `payments = [{ debtorId, creditorId, cents }]` ya ordenados. Por cada categoría con ≥ 2 participantes: `new Category([], id, id)` y `addPerson({ id: memberId, name: memberId }, paidCents − share)`. Por cada pago: categoría ficticia con el deudor en `+cents` y el acreedor en `−cents`. Llamar a `calculate()` y mapear a `[{ debtorId: p.debtor.id, creditorId: p.creditor.id, cents: p.amount }]`, filtrando `cents > 0` y asertando `Number.isInteger`. Exportar `computeBalances({ categories, payments, memberIds })`. No modificar `src/`
- [X] T014 Implementar `server/src/services/settlements.service.js` (research R5, R6, R12): `withGroupLock(groupId, fn)` = `prisma.$transaction(async (tx) => { await tx.$queryRaw\`SELECT id FROM groups WHERE id = ${groupId}::uuid FOR UPDATE\`; return fn(tx) })`. `loadCalculationInput(tx, groupId)`: categorías por `createdAt, id` con participantes por `createdAt, id`; `tx.expense.groupBy({ by: ['categoryId','paidById'], _sum: { amount: true }, where: { groupId } })` convertido a centavos; pagos (`settlements` con `paid = true`) por `paidAt, id`. `recalculatePending(tx, groupId)`: `deleteMany({ where: { groupId, paid: false } })`, `computeSettlements`, `createMany` con `position` = índice y `amount` en string decimal. `getSettlementsView(db, groupId)`: pendientes por `position`, pagadas por `paidAt`, ambas con `debtor`/`creditor` (`id`, `displayName`) y `paidBy` (`id`, `name`), más `balances` de `computeBalances` para todos los miembros del grupo en orden de alta, con montos formateados (`formatMoney`)

### Acceso, rutas y errores

- [X] T015 [P] Implementar `server/src/middleware/loadGroup.js` y `server/src/middleware/validateIdParam.js`. En `validateIdParam.js`, exportar `validateIdParam(req, res, next, value)`, apto para `router.param`, que con un valor que no es UUID (`UUID_RE` de `requireAuth.js`, movido a `server/src/lib/ids.js` y reutilizado por los tres archivos) responda `next(new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado'))`, así ningún id malformado llega a Prisma, que lo rechazaría con `P2023` → 500 (Principio VI: toda entrada se valida en middleware). En `loadGroup.js`: valida que `req.params.groupId` sea un UUID (si no, 404); busca el grupo con `prisma.group.findUnique({ where: { id }, include: { members: { where: { userId: req.user.id } } } })`; si no existe o si `ownerId !== req.user.id` y no hay membresía → `next(new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado'))`; si no, `req.group = group`, `req.role = ownerId === req.user.id ? 'owner' : 'member'`, `req.membership = members[0] ?? null`. Exportar también `requireOwner` (403 si `req.role !== 'owner'`)
- [X] T016 [P] Implementar `server/src/lib/serializers.js`: `displayName(member)` (necesita `member.user` incluido), `toMember`, `toCategory` (con `createdBy`, `participants` en orden de alta con `paid` por participante, `total`), `toExpense` (`amount` y `date` como `YYYY-MM-DD`), `toGroupSummary(group, userId)` (`role`, `owner`, `memberCount`), `toGroupDetail`. Todos los montos con `formatMoney(decimalToCents(…))`
- [X] T017 Modificar `server/src/middleware/errorHandler.js`: mapear `P2002` según la restricción violada. Leer `err.meta?.target` (puede ser el nombre del índice o la lista de campos) y además buscar el nombre en `err.message`: `categories_group_name_ci` → 409 `CATEGORY_NAME_TAKEN` "Ya hay una categoría con ese nombre en el grupo"; `group_members_group_alias_ci` → 409 `ALIAS_TAKEN` "Ya hay un invitado con ese alias en el grupo"; `group_id`+`user_id` de `group_members` → 409 `ALREADY_MEMBER` "Esa persona ya es miembro del grupo"; `category_id`+`member_id` de `category_participants` → 409 `ALREADY_PARTICIPANT` "Ese miembro ya participa de la categoría"; se mantiene `email` → `EMAIL_TAKEN`. Verificar con un test en `server/tests/integration/model.phase2.test.js` (T020) que los índices por expresión producen `P2002` y qué `target` reportan
- [X] T018 Crear `server/src/routes/groups.routes.js` con `Router({ mergeParams: true })`: `router.use(requireAuth)`, `router.param` con `validateIdParam` (T015) para `groupId`, `memberId`, `categoryId`, `expenseId` y `settlementId` (en el router y en el subrouter, porque `router.param` no se hereda), rutas de nivel `/groups` (vacías por ahora) y un subrouter `/:groupId` con `loadGroup` aplicado, donde cada historia agrega sus rutas; montarlo en `server/src/app.js` con `app.use('/groups', groupsRoutes)` antes del handler 404

### Datos de prueba y reglas de la base

- [X] T019 [P] Crear `server/tests/setup/factories.js` con helpers que escriben directo en la base (con `prisma` de `tests/setup/db.js`) y devuelven entidades más tokens: `createUser(name)` (con hash de `BCRYPT_ROUNDS=4` y email `<name>@ejemplo.com`; devuelve `{ user, token: signToken(user.id), auth: 'Bearer …' }`), `createGroup(owner, name)`, `addMember(group, { user } | { alias })`, `createCategory(group, createdBy, name, members)` (crea los participantes en orden), `createExpense(category, member, amount, createdBy, date)` y `recalc(groupId)` (llama a `withGroupLock` + `recalculatePending`). Permite que cada suite arme su escenario sin depender de los endpoints de otras historias
- [X] T020 [P] Crear `server/tests/integration/model.phase2.test.js` (SC-006, reglas de la base): rechaza un gasto cuyo pagador no es participante de la categoría (FK a `category_participants`); rechaza borrar un participante con gastos y un miembro con gastos; acepta borrar una categoría con participantes y gastos (cascada, sin error por el orden de borrado); acepta borrar un grupo completo con todo su contenido, incluidas liquidaciones pagadas; rechaza dos categorías "Nafta" y "nafta" en el mismo grupo y dos invitados "Dani" y "DANI", pero acepta el mismo nombre en otro grupo y alias iguales si uno de los miembros tiene cuenta; rechaza `paid = true` sin `paid_at` (CHECK). Registrar en el test qué `meta.target` devuelve Prisma para cada índice, que usa T017

**Checkpoint**: `npm test` pasa con las suites nuevas de dominio, dinero y modelo; las historias
pueden empezar en paralelo.

---

## Phase 3: User Story 1 - Crear y administrar mis grupos (Priority: P1) 🎯 MVP

**Goal**: `GET/POST /groups`, `GET/PATCH/DELETE /groups/:groupId` con acceso y permisos (FR-001
a FR-007).

**Independent Test**: Ana crea "Viaje" y lo ve en su lista; Carla no lo ve y `GET
/groups/:id` le responde 404; un miembro no dueño no puede borrarlo (403); Ana lo borra y
desaparece de la lista de todos.

### Tests for User Story 1 ⚠️

- [X] T021 [P] [US1] Integration tests en `server/tests/integration/groups.test.js`: sin token → 401 en todas las rutas; US1-1 (201, `role: owner`, nombre recortado; nombre vacío o de 101 caracteres → 400); US1-2 (cada usuario ve solo los grupos de los que es dueño o miembro con cuenta, ordenados por fecha descendente, con `owner`, `role`, `memberCount`, `createdAt`); detalle con miembros (con `displayName`) y categorías con su total; US1-3 (Carla → 404 en GET, PATCH y DELETE, y también con un `groupId` que no es UUID: 404, nunca 500); renombrar: dueño 200, miembro 403; US1-4 (el dueño borra un grupo con miembros, categorías, gastos y liquidaciones pagadas → 204 y desaparece de las listas); US1-5 (un miembro no dueño intenta borrar → 403); campos `ownerId`/`id` en el cuerpo se ignoran (FR-029)

### Implementation for User Story 1

- [X] T022 [P] [US1] Crear `server/src/schemas/groups.schemas.js`: `groupInputSchema = z.object({ name: z.string({ error: 'El nombre es obligatorio' }).trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre no puede superar los 100 caracteres') })`
- [X] T023 [US1] Crear `server/src/controllers/groups.controller.js`: `list` (`where: { OR: [{ ownerId }, { members: { some: { userId } } }] }`, `include: { owner, _count: { select: { members: true } } }`, `orderBy: { createdAt: 'desc' }`), `create` (201 con `toGroupDetail`), `get` (miembros por `createdAt` con `user`, categorías con participantes y `_sum` de gastos), `rename` (`requireOwner`), `remove` (`requireOwner`; `prisma.group.delete`; la cascada borra todo; 204)
- [X] T024 [US1] Agregar a `server/src/routes/groups.routes.js`: `GET /`, `POST /` (validate), `GET /:groupId`, `PATCH /:groupId` (requireOwner + validate), `DELETE /:groupId` (requireOwner)

**Checkpoint**: US1 pasa sus tests sola.

---

## Phase 4: User Story 2 - Sumar miembros al grupo, con y sin cuenta (Priority: P1)

**Goal**: `GET/POST /groups/:groupId/members`, `PATCH/DELETE …/members/:memberId` (FR-008 a
FR-012).

**Independent Test**: el dueño agrega a Beto por email (con mayúsculas y espacios) y a "Dani" como
invitado; Beto pasa a tener acceso al grupo (su `GET /groups/:groupId/members` deja de dar 404); repetir cualquiera de los dos → 409; un email sin cuenta
→ 422; quitar a Dani con gastos → 409 y sin gastos → 204.

### Tests for User Story 2 ⚠️

- [X] T025 [P] [US2] Integration tests en `server/tests/integration/members.test.js`: US2-1 (por email normalizado → 201, `displayName` = nombre de la cuenta, `isGuest: false`; Beto queda con acceso al grupo: con su token, `GET /groups/:groupId/members` responde 200, mientras que antes de agregarlo respondía 404. Se usa la ruta de miembros de esta misma historia, no `GET /groups` de US1, para que US2 se pruebe sola); US2-2 (alias recortado → `isGuest: true`); US2-3 (mismo usuario otra vez, con `" BETO@Ejemplo.com "` → 409 `ALREADY_MEMBER`); US2-4 (email sin cuenta → 422 `USER_NOT_FOUND` con el mensaje que sugiere invitado); alias repetido sin distinguir mayúsculas → 409 `ALIAS_TAKEN`; cuerpo con `email` y `alias` a la vez, o con ninguno → 400; US2-6 (el dueño se agrega a sí mismo → 201); `memberId` que no es UUID en PATCH y DELETE → 404 (no 500); `memberId` de otro grupo → 404; solo el dueño agrega, cambia alias o quita (miembro → 403; ajeno → 404); `PATCH` de alias de un miembro con cuenta → 400; US2-5 (quitar a Dani con gastos → 409 `MEMBER_HAS_EXPENSES`; con un pago registrado → 409 `MEMBER_HAS_PAYMENTS`; sin gastos ni pagos → 204, deja de participar de sus categorías y las pendientes se recalculan sin él); `GET` lista en orden de alta

### Implementation for User Story 2

- [X] T026 [P] [US2] Crear `server/src/schemas/members.schemas.js`: `addMemberSchema` que acepte exactamente uno de `email` (con `emailSchema` de `auth.schemas.js`) o `alias` (trim, 1–100), con el mensaje "Indicá un email o un alias, no ambos"; `updateAliasSchema` (`alias` trim 1–100)
- [X] T027 [US2] Crear `server/src/controllers/members.controller.js`: `list`; `add` (con email: buscar el usuario, si no existe → 422 `USER_NOT_FOUND` "No hay ninguna cuenta con ese email. Podés agregarlo como invitado."; crear `GroupMember` con `userId`; con alias: crear con `alias`; los duplicados los traduce el `errorHandler` a 409); `updateAlias` (404 si el miembro no es del grupo; 400 si tiene `userId`); `remove` dentro de `withGroupLock`: 404 si no es del grupo; si tiene gastos (`expense.count({ where: { paidById } })`) → 409 `MEMBER_HAS_EXPENSES` "Este miembro pagó gastos del grupo. Primero eliminá o reasigná sus gastos."; si figura en liquidaciones pagadas → 409 `MEMBER_HAS_PAYMENTS`; si no, borrar sus pendientes (`settlement.deleteMany({ where: { groupId, paid: false, OR: [{ debtorId }, { creditorId }] } })`), borrar el miembro (la cascada borra sus participaciones) y `recalculatePending`
- [X] T028 [US2] Agregar a `server/src/routes/groups.routes.js`: `GET /:groupId/members`, `POST /:groupId/members` (requireOwner + validate), `PATCH /:groupId/members/:memberId` (requireOwner + validate), `DELETE /:groupId/members/:memberId` (requireOwner)

**Checkpoint**: US1 y US2 pasan sus tests de forma independiente.

---

## Phase 5: User Story 3 - Registrar categorías y gastos individuales (Priority: P1)

**Goal**: categorías con participantes y gastos individuales, con permisos de autor o dueño
(FR-003a, FR-013 a FR-020).

**Independent Test**: en un grupo con Ana, Beto y Dani (fábricas), se crea "Nafta" con Ana y
Dani; se registra un gasto de Dani por 15000.50; "nafta " se rechaza; Beto no puede editar el
gasto de Dani; Dani no se puede quitar de la categoría porque tiene gastos.

### Tests for User Story 3 ⚠️

- [X] T029 [P] [US3] Integration tests en `server/tests/integration/categories.test.js`: US3-1 (crear con `participantIds` → participantes en ese orden; sin `participantIds` → todos los miembros actuales; `participantIds` vacío, con un miembro de otro grupo o con un id inexistente → 400); US3-3 (nombre repetido sin distinguir mayúsculas ni espacios → 409 `CATEGORY_NAME_TAKEN`); cualquier participante del grupo crea (dueño y miembro → 201); renombrar o borrar: el dueño del grupo o el creador → 200/204, otro miembro → 403, ajeno → 404; US3-6 (borrar una categoría con gastos → 204, sus gastos y participantes desaparecen y las pendientes se recalculan); US3-8 (sumar un participante → 201 y entra en el reparto aunque no haya pagado; sumarlo dos veces → 409 `ALREADY_PARTICIPANT`; quitar uno con gastos → 409 `PARTICIPANT_HAS_EXPENSES`; quitar el último → 400; quitar uno sin gastos → 204 y recálculo); `GET` lista con `total` y lo pagado por cada participante; `categoryId` o `memberId` (de participante) que no son UUID → 404 (no 500)
- [X] T030 [P] [US3] Integration tests en `server/tests/integration/expenses.test.js`: US3-2 (201 con `amount: "15000.50"`, `date: "2026-10-05"`, descripción recortada, `createdBy` = usuario); FR-017 (monto `"0"`, `"-1"`, `"1.234"`, `10000000000` y `"abc"` → 400 con `fields.amount`; número JSON `300` → `"300.00"`); sin fecha o con `"2026-02-30"` → 400; US3-5 (pagador que no participa de la categoría o que es de otro grupo → 400 con `fields.paidById`); `GET` de la categoría ordenado por fecha descendente (empate por `createdAt` descendente); US3-4 (el autor modifica monto, fecha, descripción, pagador y categoría → 200; mover a una categoría donde el pagador no participa → 400); US3-7 (otro miembro → 403 en PATCH y DELETE, pero 200 en GET; el dueño del grupo puede editar el gasto de otro → 200); borrar → 204; un gasto de otro grupo por id → 404; `expenseId` que no es UUID → 404 (no 500); crear, modificar y borrar recalculan las pendientes (verificar con `GET /settlements` cuando exista, o leyendo la tabla `settlements`)

### Implementation for User Story 3

- [X] T031 [P] [US3] Crear `server/src/schemas/categories.schemas.js`: `createCategorySchema` (`name` trim 1–100; `participantIds` opcional, array de UUID con `min(1)` y sin repetidos), `renameCategorySchema`, `addParticipantSchema` (`memberId` UUID)
- [X] T032 [P] [US3] Crear `server/src/schemas/expenses.schemas.js`: `moneySchema` (string o number, `refine` con `parseMoney` y mensaje "El monto debe ser mayor que cero, tener como máximo 2 decimales y no superar 9.999.999.999,99"; transforma a centavos y rechaza 0), `dateSchema` (`YYYY-MM-DD` y fecha de calendario válida), `createExpenseSchema` (`paidById` UUID, `amount`, `date`, `description` opcional trim máx. 200, vacío → `null`), `updateExpenseSchema` (todos opcionales + `categoryId`, al menos un campo)
- [X] T033 [US3] Crear `server/src/controllers/categories.controller.js`: helper `assertCanEdit(req, category)` (dueño del grupo o `category.createdById === req.user.id`; si no, 403); `list`/`get` (404 si no es del grupo); `create` dentro de `withGroupLock`: verificar que todos los `participantIds` son miembros del grupo (si no, 400 `fields.participantIds`), o usar todos los miembros por `createdAt`; crear la categoría con `createdById` y los participantes uno por uno en ese orden (para que `createdAt` respete el orden); `recalculatePending`; `rename`; `remove` (cascada + recálculo); `addParticipant` (miembro del grupo o 400; duplicado → 409 vía `errorHandler`; recálculo); `removeParticipant` (si tiene gastos en la categoría → 409 `PARTICIPANT_HAS_EXPENSES` "Este participante pagó gastos en la categoría"; si es el último → 400 "La categoría tiene que tener al menos un participante"; recálculo)
- [X] T034 [US3] Crear `server/src/controllers/expenses.controller.js`: `listByCategory` (404 si la categoría no es del grupo; `orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]`; incluye `paidBy.user` y `createdBy`); `get`; `create` dentro de `withGroupLock`: la categoría debe ser del grupo (404) y `paidById` participante de esa categoría (si no, 400 `fields.paidById` "Quien pagó tiene que participar de la categoría"); guardar con `createdById` y monto `centsToDecimalString`; recálculo; `update` (`assertCanEdit` con dueño o `createdById`; combinar los valores actuales con los nuevos y validar el par categoría-pagador; recálculo); `remove` (`assertCanEdit`; recálculo; 204)
- [X] T035 [US3] Agregar a `server/src/routes/groups.routes.js`: `GET/POST /:groupId/categories`, `GET/PATCH/DELETE /:groupId/categories/:categoryId`, `POST /:groupId/categories/:categoryId/participants`, `DELETE /:groupId/categories/:categoryId/participants/:memberId`, `GET/POST /:groupId/categories/:categoryId/expenses`, `GET/PATCH/DELETE /:groupId/expenses/:expenseId`, cada una con su `validate`

**Checkpoint**: US1–US3 pasan sus tests de forma independiente.

---

## Phase 6: User Story 4 - Ver quién le debe a quién, calculado por el sistema (Priority: P1)

**Goal**: `GET /groups/:groupId/settlements` devuelve pendientes, pagadas y saldos, sin modificar
nada (FR-021 a FR-027b).

**Independent Test**: con un grupo armado con fábricas (Ana pagó 300 en "Nafta" con Beto y Dani
como participantes) y `recalc`, la consulta devuelve Beto→Ana 100.00 y Dani→Ana 100.00; dos
consultas seguidas devuelven los mismos ids; sumar un gasto cambia las pendientes.

### Tests for User Story 4 ⚠️

- [X] T036 [P] [US4] Integration tests en `server/tests/integration/settlements.test.js`: US4-1 a US4-5 de punta a punta, con los montos como strings (`"100.00"`, `"33.33"`), `debtor`/`creditor` con `displayName` (también para invitados) y orden por `position`; US4-6 (dos `GET` seguidos → mismos `id`; después de crear un gasto por la API → ids nuevos y montos actualizados); US4-7 y US4-8 con una liquidación pagada creada con fábricas (pendiente por la diferencia; pago de más → transferencia que devuelve el excedente, con los `balances` en cero tras sumar pagadas y pendientes); `balances` incluye a todos los miembros (también al que no participa de ninguna categoría, con todo en `"0.00"`) y la suma de `pendingNet` es `"0.00"`; el dueño no miembro no aparece en `balances`; Carla ajena → 404

### Implementation for User Story 4

- [X] T037 [US4] Crear `server/src/controllers/settlements.controller.js` con `getView` (`res.json(await getSettlementsView(prisma, req.group.id))`, sin escribir nada) y agregar `GET /:groupId/settlements` en `server/src/routes/groups.routes.js`

**Checkpoint**: US1–US4 completas: el producto ya calcula en el servidor (MVP de la fase).

---

## Phase 7: User Story 5 - Marcar una liquidación como pagada (Priority: P2)

**Goal**: `PATCH /groups/:groupId/settlements/:settlementId` para registrar pagos totales o
parciales, o anularlos, con permisos y detección de liquidaciones reemplazadas (FR-027c, FR-028,
FR-028a).

**Independent Test**: Beto registra un pago de 60 sobre "Beto→Ana 100" y queda 40 pendiente;
el id viejo da 409 `SETTLEMENT_CHANGED`; Carla (miembro sin rol en la deuda) recibe 403; anular
el pago vuelve a "Beto→Ana 100".

### Tests for User Story 5 ⚠️

- [X] T038 [P] [US5] Integration tests en `server/tests/integration/settlements.payments.test.js`: US5-1 (el deudor, el acreedor o el dueño registran el pago total → `paid` con `paidAt` y `paidBy`; la respuesta es la vista completa); US5-4 (otro miembro con cuenta → 403; puede ver con GET); US5-3 (usuario ajeno → 404); US5-5 (deuda de un invitado: el acreedor o el dueño pueden; el invitado no tiene cuenta); US5-7 (pago parcial `"60"` → pagada por 60.00 y pendiente nueva por 40.00); US5-8 (`"120"`, `"0"`, `"1.001"` → 400); US5-6 (usar el id de una pendiente reemplazada por un recálculo → 409 `SETTLEMENT_CHANGED` "Las liquidaciones cambiaron. Volvé a consultarlas."); pagar una ya pagada → 409 `SETTLEMENT_ALREADY_PAID`; `settlementId` que no es UUID → 404 (no 500); US5-2/US5-9 (`{ "paid": false }` sobre una pagada → se borra y se recalcula; la pendiente vuelve al monto anterior); `{ "paid": false }` sobre una pendiente → 400; cuerpo sin `paid` → 400

### Implementation for User Story 5

- [X] T039 [P] [US5] Crear `server/src/schemas/settlements.schemas.js`: `updateSettlementSchema = z.object({ paid: z.boolean({ error: 'Indicá si está pagada' }), amount: moneySchema.optional() })`, reutilizando `moneySchema` de `expenses.schemas.js`; `amount` solo tiene sentido con `paid: true` (con `paid: false` → 400)
- [X] T040 [US5] Agregar `update` en `server/src/controllers/settlements.controller.js`, todo dentro de `withGroupLock`. Buscar la liquidación por id y `groupId`; si no existe → 409 `SETTLEMENT_CHANGED` (el grupo ya pasó `loadGroup`, así que el usuario tiene acceso, y un id que no está entre las vigentes es una pendiente reemplazada). Permiso: dueño del grupo, o `req.membership?.id` igual a `debtorId` o `creditorId`; si no, 403. Con `paid: true`: si ya está pagada → 409 `SETTLEMENT_ALREADY_PAID`; `amount` por defecto = monto de la liquidación; si es mayor → 400 `fields.amount` "El pago no puede superar el monto de la liquidación"; actualizar a `paid: true, amount, paidAt: new Date(), paidById: req.user.id`. Con `paid: false`: si está pendiente → 400; si está pagada, borrarla. En ambos casos, `recalculatePending` y responder con `getSettlementsView(tx, groupId)`
- [X] T041 [US5] Agregar `PATCH /:groupId/settlements/:settlementId` (validate) en `server/src/routes/groups.routes.js`

**Checkpoint**: todas las historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: rendimiento, Docker, documentación académica y verificación antes del merge.

- [X] T042 [P] Crear `server/scripts/settlements-p95.js` (SC-003): registra un usuario por la API, crea un grupo con 20 miembros invitados, 10 categorías (todos participantes) y 500 gastos de montos pseudoaleatorios de semilla fija; luego mide 20 veces `GET /groups/:id/settlements` y 20 veces `POST` de un gasto (que dispara el recálculo), e imprime mediana y p95 de cada uno con "OK"/"FALLA" contra 2000 ms. Correrlo contra la API levantada (`node scripts/settlements-p95.js [url]`) y anotar el resultado en `specs/002-groups-expenses-settlements/quickstart.md` §4
- [X] T043 [P] Ampliar `docs/entregables/casos-de-uso.md`: agregar al diagrama PlantUML el actor "Dueño del grupo" (especialización de "Usuario registrado") y los casos CU-04 Crear y administrar grupo, CU-05 Agregar o quitar miembro, CU-06 Gestionar categoría y participantes, CU-07 Registrar gasto, CU-08 Consultar liquidaciones y CU-09 Registrar pago (los que modifican el reparto `<<include>>` "Recalcular liquidaciones"), con una ficha por caso (actor, precondiciones, flujo principal, flujos alternativos con los errores 403/404/409 de la spec, postcondiciones y requisitos FR-xxx), derivados de US1–US5 y los casos borde de `specs/002-groups-expenses-settlements/spec.md`
- [X] T044 [P] Actualizar `docs/entregables/diagrama-de-clases.md`: agregar la clase `CategoryParticipant` (asociación entre `Category` y `GroupMember`), los atributos `createdBy` en `Category` y `Expense` y `paidAt`/`paidBy`/`position` en `Settlement`, la restricción "quien pagó es participante de la categoría", la nota del estado pendiente/pagada de la liquidación y las clases de dominio del cliente reutilizadas (`Category.distribute()`, `calculate()`, `Peer`) con su relación con `Settlement`
- [X] T045 Ampliar `docs/entregables/plan-de-pruebas.md` con casos CP-29 en adelante derivados de CU-04 a CU-09 (T043), cada uno con su respaldo automatizado (`server/tests/...`) o manual (pasos de `specs/002-groups-expenses-settlements/quickstart.md` §2), incluidos los casos de permisos (403/404) y de cálculo (escenarios de referencia de SC-001)
- [X] T046 Validar con Docker: `docker compose up --build` (con `DB_HOST_PORT` si corresponde) aplica las dos migraciones, la API arranca con Node 24 y el cálculo funciona dentro del contenedor (el dominio se resuelve desde `/repo/src` y `uuid` por el enlace); recorrer los 15 pasos de `specs/002-groups-expenses-settlements/quickstart.md` §2 contra el contenedor y corregir `server/Dockerfile`, `.dockerignore` o la documentación si algo falla
- [X] T047 Verificación previa al merge: `npm test` en `server/` (Fase 1 + Fase 2, todo en verde), `npm run build` en la raíz sin advertencias nuevas, y `git status` sin `server/.env` ni `node_modules`. Revisar que ningún archivo de `src/` cambió salvo los imports de T001 (`git diff main -- src/`)
  - *Estado 2026-10-07*: `npm test` 265/265 ✅; `npm run build` sin advertencias nuevas ✅; en `src/` solo cambian los 3 imports ✅. **Pendiente**: `server/.env` quedó **versionado** en el commit `27e32e65` ("Specs Fase 2", sin subir al remoto). Hay que sacarlo del historial antes de subir la rama (`git rm --cached server/.env` y corregir ese commit) y regenerar el `JWT_SECRET` local.
  - *Estado 2026-10-08*: `server/.env` ya no figura en ningún commit (el de specs quedó como `f03df2f2`); solo se versiona `server/.env.example` y `/server/.env` está en `.gitignore` ✅. `JWT_SECRET` local regenerado ✅. Ninguna rama `feature/*` estaba en el remoto, así que el secreto anterior nunca se publicó.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 y T002 primero (sin ellos el servidor no carga el dominio); T003–T005
  en paralelo; T006 al final.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias.
  - T007 → T008 → T009 (el modelo antes que todo lo que lo usa).
  - T010 → T011 y T012 → T013 (tests primero); T014 depende de T008, T011 y T013.
  - T015, T016 y T019 dependen de T008; T017 depende de T020 (que informa los `target` de
    `P2002`); T018 depende de T015.
- **US1–US4**: dependen solo de Foundational y se pueden hacer en paralelo, salvo que todas
  agregan rutas a `server/src/routes/groups.routes.js` (editarlo en secuencia).
- **US5**: depende de Foundational y de `settlements.controller.js` creado en T037 (US4).
- **Polish**: T042 y T046 dependen de todas las historias; T043–T045 pueden empezar apenas
  está la spec (son documentación); T047 va al final de todo.

### User Story Dependencies

```text
Setup → Foundational ─┬─> US1 (grupos)
                      ├─> US2 (miembros)
                      ├─> US3 (categorías y gastos)
                      └─> US4 (consulta de liquidaciones) ──> US5 (pagos)
                                                                     └─> Polish
Entregables (T043–T045): en paralelo con todo, antes de T047
```

### Within Each User Story

- Tests primero y fallando → schemas → controlador → rutas.
- Archivos compartidos (`groups.routes.js`, `settlements.controller.js`, `errorHandler.js`) se
  editan en secuencia.

### Parallel Opportunities

- Setup: T003, T004 y T005.
- Foundational: T010/T012 (tests) en paralelo; T011/T013 en paralelo; T015, T016, T019 y T020
  en paralelo tras T008.
- Historias: con Foundational listo, US1, US2, US3 y US4 en paralelo (cada una con su archivo de
  tests, schema y controlador); dentro de cada una, el test y el schema en paralelo.
- Polish: T042–T045 en paralelo.

---

## Parallel Example: User Story 3

```bash
# Tests de US3 en paralelo:
Task: "Integration tests de categorías en server/tests/integration/categories.test.js"
Task: "Integration tests de gastos en server/tests/integration/expenses.test.js"

# Schemas de US3 en paralelo:
Task: "Schemas de categorías en server/src/schemas/categories.schemas.js"
Task: "Schemas de gastos en server/src/schemas/expenses.schemas.js"
```

## Parallel Example: equipo de 2–3 personas

```bash
# Tras Foundational:
Persona A: US1 → US4 → US5          (grupos y liquidaciones)
Persona B: US2 → US3                 (miembros, categorías y gastos)
Persona C: T043–T045                 (entregables académicos) + T042
```

---

## Implementation Strategy

### MVP First (US1 + US3 + US4)

1. Phase 1: Setup (Node 24, extensiones `.js`, Docker).
2. Phase 2: Foundational (CRÍTICO: el cálculo reutilizado y validado contra la app vive acá).
3. US1 (grupos) → US3 (categorías y gastos, con miembros creados por fábricas) → US4
   (consulta). Con eso, el servidor ya hace lo que hacía la app: cargar gastos y ver quién le
   debe a quién.
4. **STOP and VALIDATE** contra los escenarios de referencia (SC-001).

### Incremental Delivery

1. Setup + Foundational → cálculo en el servidor probado contra la app.
2. US1 → grupos.
3. US2 → miembros con y sin cuenta (el grupo se vuelve compartido).
4. US3 → categorías y gastos.
5. US4 → liquidaciones calculadas por el sistema (equivalente a la app).
6. US5 → pagos totales y parciales (valor nuevo frente a la app).
7. Polish → rendimiento, Docker, entregables y merge.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- **No modificar** `src/utils/calculate.js` ni la lógica de `src/classes/` (Principio I). Si un
  test revela un bug del algoritmo, se corrige como bug de cálculo con su prueba de regresión
  (Principio III) y se documenta, en una tarea aparte.
- La advertencia "VM Modules is an experimental feature" al correr `npm test` es esperada
  (research R9).
- Commits en español y en modo imperativo, uno por tarea o grupo lógico.
