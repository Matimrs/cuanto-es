# Implementation Plan: Backend base y autenticación (Fase 1)

**Branch**: `feature/001-backend-auth-base` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-backend-auth-base/spec.md`

## Summary

Se crea el paquete `server/` (Node + Express 5, CommonJS) junto a la app React existente, que
queda en la raíz. El modelo completo de `docs/CLAUDE.md` §4 (User, Group, GroupMember,
Category, Expense, Settlement) se persiste en PostgreSQL 16 mediante Prisma. Las reglas de
integridad se garantizan en la base: claves foráneas compuestas para "mismo grupo" y `CHECK`
en SQL para montos, alias y acreedor distinto del deudor. Se exponen solo tres endpoints:
`POST /auth/register`, `POST /auth/login` y `GET /auth/me`. Usan bcrypt (`bcryptjs`) para las
contraseñas, JWT HS256 con 7 días de vigencia y validación con `zod` en middleware. Todo se
levanta con un único `docker compose up --build` (servicios `api` y `db`), y los endpoints se
prueban con Jest + Supertest contra una base de test real.

## Technical Context

**Language/Version**: JavaScript (CommonJS) sobre Node.js 22 LTS (imagen `node:22-alpine`; en
local, Node ≥ 22)

**Primary Dependencies**: express 5, @prisma/client + prisma 6.x, jsonwebtoken, bcryptjs, zod.
Dev: jest, supertest.

**Storage**: PostgreSQL 16 (contenedor `db`, volumen `db_data`). Base `cuantoes` para
desarrollo y `cuantoes_test` para tests.

**Testing**: Jest + Supertest (integración contra la base de test real, `--runInBand`) y unit
tests con Jest.

**Target Platform**: contenedor Linux (Docker Compose) en las máquinas del equipo (Windows); el
destino de producción sigue en TODO(DEPLOY_TARGET).

**Project Type**: web service (API REST JSON) dentro de un repositorio que también contiene la
SPA React.

**Performance Goals**: login en menos de 2 s en el p95 en desarrollo (SC-004), con un costo de
bcrypt de 12.

**Constraints**:

- Contraseñas de 8 caracteres como mínimo y 72 bytes UTF-8 como máximo; nunca en claro en la
  base, los logs ni las respuestas.
- Errores sin detalles internos.
- Arranque en un solo paso.
- Montos `DECIMAL(12,2)` en ARS.

**Scale/Scope**: escala académica (decenas de usuarios); 3 endpoints, 6 tablas, 1 migración
inicial.

Las incógnitas se resolvieron en [research.md](research.md) (R1–R14). No queda ninguna marcada
como NEEDS CLARIFICATION.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| **I. Exactitud del cálculo** | `calculate.js` y `distribute()` no se tocan. Los montos se modelan en `DECIMAL(12,2)`, nunca en float; el cálculo en el servidor llega en la Fase 2. | ✅ PASS |
| **II. Dominio reutilizable / servidor como fuente de verdad** | El servidor sigue el flujo `routes/ → controllers/ → models/` (Prisma). No se reimplementa lógica de dominio y la app React no se rehace. La SPA sigue en la raíz y no en `client/`, como permite la regla "Transición al monorepo" de Restricciones Técnicas (constitución v2.1.0). | ✅ PASS |
| **III. Pruebas** | No se toca la lógica de reparto. Se agregan tests de integración de auth (recomendados) y pruebas de las reglas de integridad (SC-008). | ✅ PASS |
| **IV. UX responsive y clara** | No hay cambios de UI. Los mensajes de error de la API están en castellano y toda entrada se valida en el servidor. | ✅ PASS |
| **V. Stack fijo** | Express, PostgreSQL, Prisma, JWT + bcrypt y Docker Compose, como manda el stack. Deps nuevas justificadas: `zod` (validación en middleware, R6), `jsonwebtoken` (R5), `bcryptjs` (bcrypt en JS puro, R4), `supertest` (pedido explícito). Sin TypeScript, sin otro ORM. | ✅ PASS |
| **VI. Seguridad y privacidad** | Hash bcrypt; JWT sin sesiones; middleware `requireAuth` reutilizable; validación en middleware; `server/.env` en `.gitignore` y `.env.example` versionado; `docker-compose.yml` sin credenciales (R8); ningún servicio externo. El acceso al grupo para el miembro con cuenta o el propietario (FR-021) coincide con el Principio VI enmendado en la v2.1.0; los endpoints que lo aplican llegan en la Fase 2. | ✅ PASS |
| **VII. Persistencia e historial** | Gastos individuales, `Group` en lugar de la sesión implícita, invitados con `userId` nulo, `Settlement.paid`, migraciones de Prisma versionadas. | ✅ PASS |
| **Entregables académicos** | Las fichas de casos de uso "Registrarse", "Iniciar sesión" y "Consultar identidad" salen de las US1–US3 (Plantilla 02, 13/10); `data-model.md` es la base del diagrama de clases UML; los casos del plan de pruebas formal salen de los escenarios de aceptación. Se versionan en `docs/entregables/` (tareas de la fase "Entregables académicos" de tasks.md). | ✅ PASS |
| **Flujo** | Rama corta `feature/001-backend-auth-base`. Antes del merge, `npm test` en `server/` y `npm run build` del cliente (no se modifica). Commits en español y en modo imperativo. | ✅ PASS |

**Re-check post-diseño (Fase 1)**: sin cambios. El diseño agrega `groupId` a `Expense` (desvío
del modelo de `docs/CLAUDE.md`, no de la constitución) para garantizar FR-019 en la base, y
suma `healthcheck` + `environment` + `command` al compose de §8. Ninguno de los dos viola
principios.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-auth-base/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones R1–R14
├── data-model.md        # Fase 1: entidades, reglas, FK compuestas, CHECKs
├── quickstart.md        # Fase 1: cómo levantar y validar de punta a punta
├── contracts/
│   └── auth-api.yaml    # Fase 1: OpenAPI de /auth/register, /auth/login, /auth/me
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks, todavía no creado)
```

### Source Code (repository root)

```text
cuanto-es/
├── docker-compose.yml          # NUEVO: servicios db (postgres:16) + api, según CLAUDE.md §8 + R8 (sin credenciales: env_file)
├── .gitignore                  # MODIFICADO: + server/.env
├── docs/entregables/           # NUEVO: casos de uso, diagrama de clases, plan de pruebas (Entregables Académicos)
├── package.json, src/, public/ # SIN CAMBIOS: SPA React (sigue en la raíz)
└── server/                     # NUEVO
    ├── package.json            # scripts: start, dev, test, prisma:migrate
    ├── Dockerfile              # node:22-alpine; CMD: DATABASE_URL←DOCKER_DATABASE_URL, migrate deploy, node src/index.js
    ├── .dockerignore
    ├── .env.example            # lista única de claves en research.md R7 (DATABASE_URL, DOCKER_DATABASE_URL,
    │                           # TEST_DATABASE_URL, JWT_SECRET, PORT, BCRYPT_ROUNDS, POSTGRES_*)
    ├── jest.config.js          # globalSetup (migraciones en la base de test), testEnvironment node
    ├── docker/
    │   └── init-test-db.sql    # CREATE DATABASE cuantoes_test
    ├── prisma/
    │   ├── schema.prisma       # 6 modelos (data-model.md)
    │   └── migrations/
    │       └── <ts>_init/migration.sql   # generado por Prisma + CHECKs agregados a mano
    ├── src/
    │   ├── index.js            # carga config, crea la app, listen(PORT)
    │   ├── app.js              # createApp(): json, rutas, 404, errorHandler (exportado para Supertest)
    │   ├── config.js           # lee y valida el entorno; falla si falta una clave (FR-025)
    │   ├── models/
    │   │   └── prisma.js       # instancia única de PrismaClient
    │   ├── routes/
    │   │   └── auth.routes.js  # POST /register, POST /login, GET /me
    │   ├── controllers/
    │   │   └── auth.controller.js
    │   ├── middleware/
    │   │   ├── validate.js     # validate(schema) con zod → 400 VALIDATION_ERROR
    │   │   ├── requireAuth.js  # Bearer JWT → req.user; reutilizable en la Fase 2 (FR-011)
    │   │   └── errorHandler.js # mapeo P2002/P1001/… → contrato de error (R12)
    │   ├── schemas/
    │   │   └── auth.schemas.js # registerSchema, loginSchema (normalización de email, 72 bytes)
    │   └── lib/
    │       ├── tokens.js       # signToken / verifyToken (HS256, 7d)
    │       ├── passwords.js    # hashPassword / verifyPassword (bcryptjs)
    │       ├── httpError.js    # clase HttpError(status, code, message, fields)
    │       ├── env.js          # loadLocalEnv(): lee server/.env sin pisar variables ya definidas (R7)
    │       └── users.js        # toPublicUser(): vista pública { id, name, email }
    ├── scripts/
    │   └── login-p95.js        # medición de SC-004 contra la API levantada
    └── tests/
        ├── setup/              # globalSetup (migrate deploy) + helper de truncado
        ├── integration/        # auth.register, auth.login, auth.me, model.integrity
        └── unit/               # config, schemas, tokens
```

**Structure Decision**: se adopta la mitad `server/` del monorepo objetivo de la constitución
(Principio V, Restricciones Técnicas), con las carpetas `routes/controllers/models/middleware`
que fija `docs/CLAUDE.md` §3, más `schemas/` y `lib/` para la validación y la criptografía.
La SPA React no se mueve a `client/` en esta feature, porque el usuario excluyó los cambios en
el frontend. `server/` es un paquete npm independiente, con su propio `package.json` y
`node_modules`, así que `react-scripts test` (que solo mira `src/`) no levanta los tests del
backend.

### Flujo de una solicitud

```text
request → express.json() → router /auth
        → validate(schema)          (400 si falla; normaliza email y descarta campos extra)
        → [requireAuth]             (solo /me; 401 si el token no es válido)
        → controller                (Prisma + passwords/tokens)
        → response JSON
errores → errorHandler              (HttpError | Prisma P2002→409 | P1001→503 | otros→500)
```

### Notas de implementación relevantes para las tareas

- **Login con tiempo constante**: si el email no existe, se compara igual contra un hash bcrypt
  ficticio precalculado, para que el tiempo de respuesta no revele qué emails tienen cuenta
  (complementa FR-008).
- **`/auth/me`**: además del token, verifica que el usuario siga existiendo en la base (si no
  existe → 401).
- **JSON mal formado**: el error de `express.json()` se traduce a `400 VALIDATION_ERROR`, no a
  500.
- **Migración inicial**: se genera con `prisma migrate dev --create-only`, se le agregan los
  tres `CHECK` de data-model.md y recién después se aplica.
- **`.gitignore` de la raíz**: agregar `server/.env` (hoy solo ignora `.env.*.local`).

## Complexity Tracking

Sin violaciones de la constitución (v2.1.0). Los dos desvíos registrados antes se resolvieron
con la enmienda 2.0.0 → 2.1.0:

- **SPA en la raíz en lugar de `client/`**: ahora la ampara la regla "Transición al monorepo"
  (Restricciones Técnicas). La mudanza se hace en una feature propia antes de terminar la Fase 3.
- **Dueño con acceso al grupo sin ser miembro**: el Principio VI ya admite al miembro con cuenta
  o al propietario.
