---

description: "Lista de tareas para implementar el backend base y la autenticación (Fase 1)"
---

# Tasks: Backend base y autenticación (Fase 1)

**Input**: Documentos de diseño en `/specs/001-backend-auth-base/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.yaml, quickstart.md

**Tests**: SE INCLUYEN. El plan pide explícitamente Jest + Supertest contra una base de test real,
SC-008 exige una prueba por cada regla de integridad (FR-016 a FR-021) y el Principio III
recomienda las pruebas de integración de auth. Los tests de cada historia se escriben primero y
deben FALLAR antes de implementar.

**Organization**: tareas agrupadas por historia de usuario para implementarlas y probarlas de
forma independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US5)
- Todas las rutas son relativas a la raíz del repositorio. El backend vive en `server/`; la SPA
  React de la raíz (`src/`, `public/`, `package.json`) **no se toca**.

## Convenciones comunes (aplican a todas las tareas)

- JavaScript **CommonJS** (`require`/`module.exports`), Node ≥ 22, Express 5 (R1, R2).
- Formato de error único (R12): `{ "error": { "code", "message", "fields"? } }`, con los códigos
  `VALIDATION_ERROR`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `NOT_FOUND`,
  `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR` y los mensajes en castellano de
  `contracts/auth-api.yaml`.
- Nunca loguear `req.body` ni contraseñas (FR-005). Los errores se loguean con `console.error`
  (método, ruta y stack).
- Vista pública del usuario: `{ id, name, email }`; nunca incluir `passwordHash`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: crear el paquete `server/` y su configuración base.

- [ ] T001 Crear la estructura de carpetas de `server/` según plan.md (`server/src/{models,routes,controllers,middleware,schemas,lib}`, `server/prisma/`, `server/docker/`, `server/tests/{setup,integration,unit}`)
- [ ] T002 Crear `server/package.json` (`"name": "cuantoes-server"`, `"private": true`, CommonJS, `"engines": { "node": ">=22" }`) con dependencias de versión exacta: `express@5`, `@prisma/client@6`, `prisma@6` (en dependencies porque el contenedor ejecuta `prisma migrate deploy` al arrancar), `jsonwebtoken`, `bcryptjs`, `zod`; devDependencies: `jest`, `supertest`; scripts `start` (`node src/index.js`), `dev` (`node --watch src/index.js`), `test` (`jest --runInBand`), `prisma:migrate` (`prisma migrate dev`); luego ejecutar `npm install` en `server/` para generar `server/package-lock.json`
- [ ] T003 [P] Crear `server/.env.example` con `DATABASE_URL=postgresql://cuantoes:cuantoes@localhost:5432/cuantoes`, `DOCKER_DATABASE_URL=postgresql://cuantoes:cuantoes@db:5432/cuantoes` (la usa el contenedor `api`, R8), `TEST_DATABASE_URL=postgresql://cuantoes:cuantoes@localhost:5432/cuantoes_test`, `JWT_SECRET=` (vacío, con comentario: mínimo 32 caracteres, cómo generarlo), `PORT=3001`, `BCRYPT_ROUNDS=12`, y `POSTGRES_USER=cuantoes`, `POSTGRES_PASSWORD=cuantoes`, `POSTGRES_DB=cuantoes` para el servicio `db`; exactamente las claves de la tabla de research.md R7, con valores de ejemplo solo para desarrollo local (FR-024)
- [ ] T004 [P] Actualizar `.gitignore` de la raíz: reemplazar la línea mal formada `/server/*.envCLAUDE.md` por `server/.env` y agregar `server/node_modules/` (hoy `/*node_modules` solo ignora la raíz) y `server/coverage/`
- [ ] T005 [P] Crear `server/.dockerignore` excluyendo `node_modules`, `.env`, `coverage`, `tests`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: base de datos, esquema completo, configuración, app Express y harness de tests.
Todas las historias dependen de esta fase.

**⚠️ CRITICAL**: no se puede empezar ninguna historia hasta terminar esta fase.

### Base de datos y entorno

- [ ] T006 [P] Crear `server/docker/init-test-db.sql` con `CREATE DATABASE cuantoes_test;` (R9)
- [ ] T007 Crear `docker-compose.yml` en la raíz (base: `docs/CLAUDE.md` §8 + R8): servicio `db` (`postgres:16`, `env_file: server/.env`, puerto `5432:5432`, volumen `db_data:/var/lib/postgresql/data`, montaje `./server/docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql:ro`, `healthcheck` con `pg_isready -U $${POSTGRES_USER}`); servicio `api` (`build: ./server`, `env_file: server/.env`, puerto `3001:3001`, `depends_on: db: condition: service_healthy`); volumen `db_data`. **El archivo no debe contener ninguna credencial** (sin bloque `environment` con `POSTGRES_PASSWORD` ni `DATABASE_URL`; Principio VI, R8)

### Esquema Prisma y migración inicial

- [ ] T008 Crear `server/prisma/schema.prisma` con `datasource db` (postgresql, `env("DATABASE_URL")`), generador `prisma-client-js` y los 6 modelos de `data-model.md`: `User`, `Group`, `GroupMember`, `Category`, `Expense`, `Settlement`, con UUID (`@default(uuid()) @db.Uuid`), camelCase mapeado a snake_case (`@map`/`@@map` a `users`, `groups`, `group_members`, `categories`, `expenses`, `settlements`), longitudes `@db.VarChar(n)`, montos `@db.Decimal(12, 2)`, fechas `@db.Timestamptz` / `@db.Date`, `email @unique`, `@@unique([groupId, userId])` y `@@unique([id, groupId])` en `GroupMember`, `@@unique([groupId, name])` y `@@unique([id, groupId])` en `Category`, `groupId` en `Expense`, FK compuestas de `Expense` → `(categoryId, groupId)` y `(paidById, groupId)` y de `Settlement` → `(creditorId, groupId)` y `(debtorId, groupId)`, `paid Boolean @default(false)`, `@@index([categoryId])` en `Expense`, y `onDelete: Restrict` en todas las relaciones
- [ ] T009 Crear el `server/.env` local (`cp server/.env.example server/.env`, completar `JWT_SECRET` con `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`; no se commitea), levantar la base con `docker compose up -d db` y generar la migración inicial con `npx prisma migrate dev --name init --create-only` y agregar a mano al final de `server/prisma/migrations/<timestamp>_init/migration.sql` los CHECK de R10: `expenses_amount_positive CHECK (amount > 0)`, `settlements_amount_positive CHECK (amount > 0)`, `settlements_distinct_members CHECK (creditor_id <> debtor_id)`, `group_members_user_or_alias CHECK (user_id IS NOT NULL OR (alias IS NOT NULL AND btrim(alias) <> ''))`; luego aplicarla con `npx prisma migrate dev` y versionar la carpeta `migrations/` (FR-022)
- [ ] T010 [P] Crear `server/src/models/prisma.js` que exporte una instancia única de `PrismaClient`

### Configuración y núcleo de la app

- [ ] T011 [P] Crear `server/src/config.js`: si existe `server/.env` lo parsea con `util.parseEnv(fs.readFileSync(...))` y asigna en `process.env` **solo las claves que no estén ya definidas** (el entorno del contenedor y el de los tests tienen prioridad, R7); exportar esa carga como `loadLocalEnv()` en `server/src/lib/env.js` para reutilizarla en `server/tests/setup/`; valida `DATABASE_URL` (obligatoria), `JWT_SECRET` (obligatoria, ≥ 32 caracteres), `PORT` (entero, 3001 por defecto) y `BCRYPT_ROUNDS` (entero 4–15, 12 por defecto); si algo falta o es inválido lanza un `Error` cuyo mensaje nombra la clave (FR-025); exporta un objeto congelado `{ databaseUrl, jwtSecret, port, bcryptRounds }`
- [ ] T012 [P] Crear `server/src/lib/httpError.js` con la clase `HttpError extends Error` (`status`, `code`, `message`, `fields` opcional)
- [ ] T013 Crear `server/src/middleware/errorHandler.js` (R12): `HttpError` → su status/código; `SyntaxError` de `express.json()` (`err.type === 'entity.parse.failed'`) → 400 `VALIDATION_ERROR` "Hay datos inválidos"; `Prisma.PrismaClientKnownRequestError` con `code === 'P2002'` sobre `email` → 409 `EMAIL_TAKEN` "Ese email ya está registrado"; `P1001` o `PrismaClientInitializationError` → 503 `SERVICE_UNAVAILABLE`; cualquier otro → 500 `INTERNAL_ERROR` "Ocurrió un error inesperado"; loguea método, ruta y stack sin el cuerpo; nunca devuelve trazas (FR-013)
- [ ] T014 Crear `server/src/app.js` con `createApp()`: `express.json()`, monta `/auth` (router de `server/src/routes/auth.routes.js`, inicialmente vacío), handler 404 `NOT_FOUND` "Recurso no encontrado" y `errorHandler` al final; exporta `createApp` para Supertest
- [ ] T015 [P] Crear `server/src/routes/auth.routes.js` como `express.Router()` vacío exportado (las historias le agregan rutas)
- [ ] T016 Crear `server/src/index.js`: importa `config` (si falla, imprime el mensaje con `console.error` y sale con `process.exit(1)`), crea la app y hace `listen(config.port)` logueando el puerto
- [ ] T017 Crear `server/Dockerfile` (`node:22-alpine`, `WORKDIR /app`, copia `package*.json` y `prisma/`, `npm ci --omit=dev`, `npx prisma generate`, copia `src/`; `EXPOSE 3001`; `CMD ["sh", "-c", "export DATABASE_URL=\"${DOCKER_DATABASE_URL:-$DATABASE_URL}\" && npx prisma migrate deploy && node src/index.js"]`) (R8: la URL con host `db` sale de `server/.env`, no del compose)

### Harness de tests

- [ ] T018 Crear `server/jest.config.js` (`testEnvironment: 'node'`, `globalSetup: './tests/setup/globalSetup.js'`, `setupFiles: ['./tests/setup/env.js']`, `testMatch: ['**/tests/**/*.test.js']`)
- [ ] T019 Crear `server/tests/setup/env.js`: llama a `loadLocalEnv()` de `server/src/lib/env.js` (T011), falla si falta `TEST_DATABASE_URL`, asigna `process.env.DATABASE_URL = process.env.TEST_DATABASE_URL`, fija `BCRYPT_ROUNDS=4` y, si falta, un `JWT_SECRET` de test de 32+ caracteres
- [ ] T020 Crear `server/tests/setup/globalSetup.js`: carga `.env` con `loadLocalEnv()`, falla con mensaje claro si falta `TEST_DATABASE_URL`, y ejecuta `npx prisma migrate deploy` con `DATABASE_URL=TEST_DATABASE_URL` (`child_process.execSync`, `stdio: 'inherit'`)
- [ ] T021 Crear `server/tests/setup/db.js` con `resetDb()` (`TRUNCATE users, groups, group_members, categories, expenses, settlements RESTART IDENTITY CASCADE` vía `prisma.$executeRawUnsafe`) y `disconnect()`. **Guarda obligatoria**: antes de truncar, consultar `SELECT current_database()` y lanzar un error si el nombre no termina en `_test` (nunca vaciar la base de desarrollo)

**Checkpoint**: `docker compose up db` + `npm test` en `server/` corre (sin tests todavía) y la base de test tiene las 6 tablas.

---

## Phase 3: User Story 1 - Registrarse con una cuenta propia (Priority: P1) 🎯 MVP

**Goal**: `POST /auth/register` crea la cuenta y devuelve `201 { user, token }` (FR-001 a FR-006, FR-012 a FR-014).

**Independent Test**: registrar `" ANA@Ejemplo.com "` → 201 con email normalizado y token, sin
campos de contraseña; repetir → 409 `EMAIL_TAKEN`; contraseña corta → 400 con `fields.password`.

### Tests for User Story 1 ⚠️

> Escribirlos primero y comprobar que FALLAN.

- [ ] T022 [P] [US1] Unit tests de `registerSchema` en `server/tests/unit/schemas.test.js`: normaliza email (trim + minúsculas), name 1–100 tras trim, password de 8 caracteres a 72 bytes UTF-8 (`'€'.repeat(25)` = 25 caracteres y 75 bytes → se rechaza; `'😀'.repeat(4)` = 4 caracteres pero `length` 8 en UTF-16 → se rechaza por corta; `'ñ'.repeat(8)` = 8 caracteres → se acepta), password no se recorta (espacios y no ASCII se conservan), descarta campos desconocidos (`id`, `passwordHash`, `createdAt`)
- [ ] T023 [P] [US1] Unit tests de `server/src/lib/passwords.js` y `signToken` en `server/tests/unit/crypto.test.js`: el hash empieza con `$2`, `verifyPassword` acepta la correcta y rechaza otra; `signToken` produce un JWT HS256 con `sub` = id y `exp - iat` = 7 días
- [ ] T024 [P] [US1] Integration tests en `server/tests/integration/auth.register.test.js` (Supertest + `resetDb()` en `beforeEach`): escenario 1 (201, `user {id,name,email}`, `token`, sin `password`/`passwordHash` en la respuesta, hash `$2` en la base); escenario 2 (`ANA@Ejemplo.com ` tras `ana@ejemplo.com` → 409 `EMAIL_TAKEN` "Ese email ya está registrado", sigue habiendo 1 fila); escenario 3 (email mal formado, sin nombre, contraseña corta → 400 `VALIDATION_ERROR` con `fields` por campo en castellano); edge cases: 2 registros concurrentes con `Promise.all` → exactamente un 201 y un 409 y 1 fila (SC-002); contraseña > 72 bytes → 400; cuerpo vacío y JSON mal formado → 400 sin trazas; `id`/`passwordHash` enviados se ignoran

### Implementation for User Story 1

- [ ] T025 [P] [US1] Crear `server/src/lib/passwords.js` con `hashPassword(plain)` y `verifyPassword(plain, hash)` usando `bcryptjs` y `config.bcryptRounds` (R4)
- [ ] T026 [P] [US1] Crear `server/src/lib/tokens.js` con `signToken(userId)` (`jwt.sign({ sub: userId }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' })`) y `verifyToken(token)` (`jwt.verify(..., { algorithms: ['HS256'] })`) (R5, FR-009)
- [ ] T027 [P] [US1] Crear `server/src/schemas/auth.schemas.js` con `emailSchema` reutilizable (`z.string().trim().toLowerCase().email('Ingresá un email válido')`) y `registerSchema` (`name` trim 1–100, `email`, `password` con `refine` de `[...p].length >= 8` (cuenta caracteres Unicode, no unidades UTF-16 como `z.string().min`; mensaje 'La contraseña debe tener al menos 8 caracteres') y `refine` de `Buffer.byteLength(p, 'utf8') <= 72` con mensaje "La contraseña no puede superar los 72 bytes"); objetos en modo `strip` (FR-014)
- [ ] T028 [P] [US1] Crear `server/src/middleware/validate.js` con `validate(schema)`: `safeParse(req.body ?? {})`; si falla → `next(new HttpError(400, 'VALIDATION_ERROR', 'Hay datos inválidos', fields))` con `fields` = primer mensaje por ruta de campo; si pasa, reemplaza `req.body` por los datos parseados (FR-012)
- [ ] T029 [US1] Crear `server/src/controllers/auth.controller.js` con `toPublicUser(user)` y `register`: `hashPassword`, `prisma.user.create` directo sin consulta previa (R13; el P2002 lo traduce `errorHandler`), responde `201 { user: toPublicUser(user), token: signToken(user.id) }` (depende de T025, T026)
- [ ] T030 [US1] Agregar `router.post('/register', validate(registerSchema), register)` en `server/src/routes/auth.routes.js` (depende de T027–T029)

**Checkpoint**: `npm test -- auth.register` y `schemas`/`crypto` pasan; el registro funciona solo.

---

## Phase 4: User Story 2 - Iniciar sesión y obtener un token (Priority: P1)

**Goal**: `POST /auth/login` devuelve `200 { user, token }` o `401 INVALID_CREDENTIALS` idéntico exista o no el email (FR-007, FR-008).

**Independent Test**: con una cuenta creada, login correcto → 200 con token; contraseña
incorrecta y email inexistente → 401 con cuerpos idénticos.

### Tests for User Story 2 ⚠️

- [ ] T031 [P] [US2] Agregar a `server/tests/unit/schemas.test.js` los casos de `loginSchema`: normaliza el email, exige `password` no vacío, no aplica la política de 8 caracteres (una contraseña vieja más corta no debe dar 400 sino 401)
- [ ] T032 [P] [US2] Integration tests en `server/tests/integration/auth.login.test.js` (cuenta creada con `prisma.user.create` + `hashPassword` en `beforeEach`): escenario 1 (`"  ANA@Ejemplo.com "` + contraseña correcta → 200 con `user` y `token` verificable); escenarios 2 y 3 (contraseña incorrecta y `nadie@ejemplo.com` → 401, `toEqual` entre ambos cuerpos y con `{ error: { code: 'INVALID_CREDENTIALS', message: 'Email o contraseña incorrectos' } }`, SC-005); cuerpo inválido → 400

### Implementation for User Story 2

- [ ] T033 [US2] Agregar `loginSchema` (`email: emailSchema`, `password: z.string().min(1, 'Ingresá tu contraseña')`) en `server/src/schemas/auth.schemas.js`
- [ ] T034 [US2] Agregar `login` en `server/src/controllers/auth.controller.js`: busca por email; si no existe, igual ejecuta `verifyPassword` contra un hash ficticio precalculado al cargar el módulo (tiempo constante, plan.md); si no existe o no coincide → `HttpError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')`; si coincide → `200 { user: toPublicUser(user), token }`
- [ ] T035 [US2] Agregar `router.post('/login', validate(loginSchema), login)` en `server/src/routes/auth.routes.js`

**Checkpoint**: US1 + US2 = MVP de la fase; ambas pasan sus tests de forma independiente.

---

## Phase 5: User Story 3 - Consultar la propia identidad con el token (Priority: P2)

**Goal**: `GET /auth/me` con un middleware `requireAuth` reutilizable (FR-010, FR-011).

**Independent Test**: con un token de login → 200 `{ user }`; sin token, alterado, vencido o
firmado con otro secreto → 401 `UNAUTHENTICATED`.

### Tests for User Story 3 ⚠️

- [ ] T036 [P] [US3] Agregar a `server/tests/unit/crypto.test.js` los casos de `verifyToken`: rechaza token alterado, vencido (firmado con `expiresIn: -1`), firmado con otro secreto y con `alg: none`
- [ ] T037 [P] [US3] Integration tests en `server/tests/integration/auth.me.test.js`: token válido → 200 `{ user: { id, name, email } }` sin `passwordHash`; sin header, header sin `Bearer`, firma alterada (un carácter cambiado), vencido, otro secreto y token de un usuario borrado de la base → 401 `{ error: { code: 'UNAUTHENTICATED', message: 'Necesitás iniciar sesión' } }` sin datos de usuario (SC-006)

### Implementation for User Story 3

- [ ] T038 [US3] Crear `server/src/middleware/requireAuth.js`: lee `Authorization: Bearer <token>`, `verifyToken`, busca el usuario por `sub` con `prisma.user.findUnique`; si algo falla o no existe → `next(new HttpError(401, 'UNAUTHENTICATED', 'Necesitás iniciar sesión'))`; si no, `req.user = toPublicUser(user)`. Exportarlo como middleware genérico, sin lógica específica de `/me`, para reutilizarlo en la Fase 2 (mover `toPublicUser` a `server/src/lib/users.js` si hace falta compartirlo)
- [ ] T039 [US3] Agregar `me` en `server/src/controllers/auth.controller.js` (`res.json({ user: req.user })`) y `router.get('/me', requireAuth, me)` en `server/src/routes/auth.routes.js`

**Checkpoint**: las tres rutas del contrato `contracts/auth-api.yaml` funcionan.

---

## Phase 6: User Story 4 - Modelo de datos completo persistido (Priority: P2)

**Goal**: demostrar que el esquema de la Fase 2 (T008–T009) cumple FR-015 a FR-021 (SC-008).

**Independent Test**: `npm test -- model.integrity` acepta las combinaciones válidas y rechaza
cada combinación inválida directamente contra la base de test.

### Tests for User Story 4 ⚠️

- [ ] T040 [P] [US4] Crear `server/tests/integration/model.integrity.test.js` con fixtures (usuario dueño, grupo, miembro con cuenta, miembro invitado con alias, categoría) y casos: las 6 tablas existen y arrancan vacías (FR-015, US4-1); gasto pagado por el invitado se guarda (US4-2); `1234.56` se relee exacto como `Decimal('1234.56').toFixed(2)` (US4-4, FR-017); rechazos con `expect(...).rejects`: gasto con monto 0 y negativo (FR-017), miembro sin `userId` ni alias y con alias `'   '` (FR-016), mismo usuario dos veces en un grupo (FR-016), liquidación con acreedor = deudor (FR-018), liquidación con un miembro de otro grupo (FR-018), gasto con categoría de otro grupo y con pagador de otro grupo (FR-019), categoría con nombre repetido en el grupo (FR-020), grupo sin dueño (FR-021); aceptaciones: dueño que no es miembro crea el grupo (FR-021), `Settlement.paid` vale `false` por defecto (FR-018), dos invitados en el mismo grupo (FR-016); edge case: gasto pagado por el dueño no miembro se rechaza (no existe `GroupMember` del dueño en ese grupo)

### Implementation for User Story 4

- [ ] T041 [US4] Ejecutar `server/tests/integration/model.integrity.test.js` y corregir `server/prisma/schema.prisma` / la migración si alguna regla no se cumple. Si hay que cambiar el esquema, crear una migración nueva con `npx prisma migrate dev --create-only` (no editar una migración ya aplicada en otra máquina) y repetir el agregado de CHECK si aplica

**Checkpoint**: SC-008 cubierto; el modelo queda listo para la Fase 2.

---

## Phase 7: User Story 5 - Entorno reproducible para el equipo (Priority: P3)

**Goal**: `docker compose up --build` deja `api` + `db` listos, con datos persistentes (FR-023 a FR-025).

**Independent Test**: en un clon limpio, siguiendo solo la documentación, el registro y el login
responden; tras `docker compose down` / `up` la cuenta sigue existiendo.

### Tests for User Story 5 ⚠️

- [ ] T042 [P] [US5] Unit tests de `server/src/config.js` en `server/tests/unit/config.test.js` (usando `jest.isolateModules` y un `process.env` controlado, con `server/src/lib/env.js` mockeado vía `jest.mock` para no leer `.env`): `loadLocalEnv()` no pisa una variable ya definida; falta `JWT_SECRET` → error que nombra `JWT_SECRET`; `JWT_SECRET` < 32 caracteres → error; falta `DATABASE_URL` → error que la nombra; `PORT` y `BCRYPT_ROUNDS` toman 3001 y 12 por defecto; `BCRYPT_ROUNDS=abc` → error

### Implementation for User Story 5

- [ ] T043 [US5] Agregar a `README.md` de la raíz una sección "Backend (server/)" con: requisitos (Docker Desktop, Node ≥ 22), `cp server/.env.example server/.env`, cómo generar `JWT_SECRET`, `docker compose up --build`, cómo correr `npm test` en `server/`, el comando `createdb` para volúmenes viejos sin `cuantoes_test` y un enlace a `specs/001-backend-auth-base/quickstart.md` (SC-007)
- [ ] T044 [US5] Validar manualmente con Docker los pasos 1–3 de `specs/001-backend-auth-base/quickstart.md`: compose arranca con `db` healthy y migraciones aplicadas, `\dt` muestra las 6 tablas, persistencia tras `down`/`up` sin `-v`, y `api` termina nombrando `JWT_SECRET` cuando falta; corregir `docker-compose.yml` o `server/Dockerfile` si algo falla

**Checkpoint**: todas las historias funcionan de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: verificación transversal antes de integrar a `main`.

- [ ] T045 [P] Verificar SC-003: después de `npm test` y del recorrido de quickstart, revisar `docker compose logs api` y la tabla `users` para confirmar que no aparece ninguna contraseña en claro; agregar en `server/tests/integration/auth.register.test.js` un caso que espíe `console.error`/`console.log` durante un registro fallido y verifique que la contraseña no aparece
- [ ] T046 [P] Agregar en `server/tests/integration/errors.test.js`: ruta inexistente → 404 `NOT_FOUND`; base no disponible (mock de `prisma.user.create` que lanza `PrismaClientInitializationError`) → 503 `SERVICE_UNAVAILABLE` sin detalles internos; error inesperado → 500 `INTERNAL_ERROR` sin stack en el cuerpo (FR-013)
- [ ] T047 Medir SC-004: script rápido (o test opcional marcado `skip` por defecto) que haga 20 logins con `BCRYPT_ROUNDS=12` contra la API levantada y compruebe que el p95 es < 2 s; documentar el resultado en `specs/001-backend-auth-base/quickstart.md`
- [ ] T048 Ejecutar `npm test` en `server/` y `npm run build` en la raíz (la SPA no debe romperse) antes del merge, según el Flujo de la constitución
- [ ] T049 [P] Revisar que `server/.env.example` incluya todas las claves que lee `server/src/config.js` y `server/tests/setup/`, y que `git status` no muestre `server/.env` ni `server/node_modules/`

---

## Phase 9: Entregables académicos (Constitución: Entregables Académicos y Principio III)

**Purpose**: mantener al día los artefactos que evalúa la cátedra. Van en `docs/entregables/`
(Markdown versionado; los diagramas en bloques PlantUML para poder exportarlos). Son
independientes del código: se pueden hacer en paralelo desde que la spec está cerrada, y DEBEN
estar listos antes de la Plantilla 02 (13/10) y antes de T048 (merge a `main`).

- [ ] T050 [P] Crear `docs/entregables/casos-de-uso.md` con el diagrama de casos de uso de esta fase (actor "Visitante" → "Registrarse", "Iniciar sesión"; actor "Usuario" → "Consultar identidad") y una ficha por caso de uso según la Plantilla 02 (nombre, actores, precondiciones, flujo principal, flujos alternativos, postcondiciones), derivadas de US1–US3, sus escenarios de aceptación y los edge cases de spec.md (email duplicado, credenciales inválidas, token vencido, base no disponible)
- [ ] T051 [P] Crear `docs/entregables/diagrama-de-clases.md` con un primer diagrama de clases UML (PlantUML) de `User`, `Group`, `GroupMember`, `Category`, `Expense` y `Settlement` a partir de `specs/001-backend-auth-base/data-model.md`: atributos con tipo, multiplicidades de las relaciones, roles `owner`, `paidBy`, `creditor` y `debtor`, y una nota con las reglas de integridad (FR-016 a FR-021). Es la base de la Plantilla 03; no reemplaza al ERD
- [ ] T052 [P] Crear `docs/entregables/plan-de-pruebas.md` con los casos del plan de pruebas formal derivados de los casos de uso de T050 (ID de caso, caso de uso, precondiciones, datos de entrada, pasos, resultado esperado), cubriendo los escenarios de aceptación de US1–US3 y los edge cases; cada caso indica qué test automatizado lo respalda (`server/tests/...`) o si es manual (pasos de `quickstart.md`). Es un artefacto distinto de los tests y no los reemplaza (Principio III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. BLOQUEA todas las historias.
  - T007 depende de T003 y T006; T009 depende de T007 y T008 (necesita `db` levantado);
    T013 depende de T012; T014 depende de T013 y T015; T016 depende de T011 y T014;
    T017 depende de T002; T019 y T020 dependen de T011 (`loadLocalEnv`); T020 y T021
    dependen de T009 y T010.
- **US1 (Phase 3)**: depende de Foundational.
- **US2 (Phase 4)**: depende de Foundational y reutiliza `passwords.js`, `tokens.js`,
  `validate.js`, `emailSchema` y `toPublicUser` de US1 (T025–T029). Si se trabaja en paralelo
  con US1, coordinar esos archivos primero.
- **US3 (Phase 5)**: depende de Foundational y de `tokens.js` (T026) y `toPublicUser` (T029).
  Sus tests usan login (US2) solo como conveniencia: pueden generar el token con `signToken`.
- **US4 (Phase 6)**: depende solo de Foundational (T008–T010, T021); es independiente de US1–US3.
- **US5 (Phase 7)**: depende de Foundational; T044 necesita además US1 y US2 para probar
  registro y login de punta a punta.
- **Polish (Phase 8)**: depende de todas las historias. T048 (verificación previa al merge)
  se ejecuta al final de todo, también después de la Phase 9.
- **Entregables académicos (Phase 9)**: solo dependen de spec.md y data-model.md; pueden
  avanzar en paralelo con cualquier fase. T052 depende de T050.

### User Story Dependencies

```text
Setup → Foundational ─┬─> US1 ──> US2 ──> US3
                      ├─> US4                    ──> Polish
                      └─> US5 (T044 tras US1+US2)
Entregables académicos (T050–T052): en paralelo con todo, antes de T048
```

### Within Each User Story

- Tests primero y fallando → libs/esquemas → controlador → ruta.
- Archivos compartidos (`auth.controller.js`, `auth.routes.js`, `auth.schemas.js`,
  `schemas.test.js`, `crypto.test.js`) se editan en secuencia, nunca en paralelo.

### Parallel Opportunities

- Setup: T003, T004, T005 en paralelo tras T001–T002.
- Foundational: T006, T010, T011, T012, T015 en paralelo; luego T019, T020 y T021.
- US1: T022–T024 (tests) en paralelo; T025–T028 en paralelo; luego T029 → T030.
- US4 completa puede avanzar en paralelo con US1–US3 (otro integrante del equipo).
- US5: T042 y T043 en paralelo con cualquier historia.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 en paralelo:
Task: "Unit tests de registerSchema en server/tests/unit/schemas.test.js"
Task: "Unit tests de passwords y signToken en server/tests/unit/crypto.test.js"
Task: "Integration tests de registro en server/tests/integration/auth.register.test.js"

# Piezas de US1 en paralelo:
Task: "passwords.js en server/src/lib/passwords.js"
Task: "tokens.js en server/src/lib/tokens.js"
Task: "registerSchema en server/src/schemas/auth.schemas.js"
Task: "validate(schema) en server/src/middleware/validate.js"
```

## Parallel Example: equipo de 2–3 personas

```bash
# Tras Foundational:
Persona A: US1 → US2 → US3   (auth)
Persona B: US4               (model.integrity.test.js)
Persona C: US5 T042–T043     (config.test.js + README) + T050–T052 (entregables)
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1: Setup.
2. Phase 2: Foundational (CRÍTICO: bloquea todo).
3. Phase 3: US1 → **validar** registro de forma independiente.
4. Phase 4: US2 → **validar** login. Registro + login = MVP de la fase (spec: "las dos historias
   forman juntas el MVP").

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → registro funcionando.
3. US2 → login funcionando (MVP, demo para la Plantilla 02 del 13/10).
4. US3 → `requireAuth` listo para la Fase 2.
5. US4 → integridad del modelo verificada (SC-008).
6. US5 → onboarding del equipo documentado y validado.
7. Polish → verificación final y merge a `main`.

---

## Notes

- [P] = archivos distintos y sin dependencias pendientes.
- Commits en español y en modo imperativo (p. ej. `Agrega endpoint de registro`), uno por tarea
  o grupo lógico.
- Antes de la Fase 2 del roadmap: enmendar el Principio VI con `/speckit-constitution` (dueño no
  miembro con acceso al grupo; ver Complexity Tracking de plan.md). No es tarea de esta feature.
- La SPA no se mueve a `client/` en esta feature (Complexity Tracking de plan.md).
