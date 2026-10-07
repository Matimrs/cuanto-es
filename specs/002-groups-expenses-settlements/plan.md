# Implementation Plan: Grupos, gastos y liquidaciones en el servidor (Fase 2)

**Branch**: `feature/002-groups-expenses-settlements` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-groups-expenses-settlements/spec.md`

## Summary

Se agregan al servidor de la Fase 1 las operaciones de grupos, miembros (con y sin cuenta),
categorías con participantes elegidos, gastos individuales y liquidaciones. Todo cuelga de
`/groups/:groupId/…` y un middleware `loadGroup` resuelve el acceso (dueño o miembro con cuenta;
si no, 404). El cálculo **reutiliza los archivos del cliente** `src/utils/calculate.js` y
`src/classes/Category.js` con `require()` de ESM. En el cliente solo se agrega la extensión `.js`
a tres imports. Un adaptador puro les pasa saldos netos en **centavos enteros**, con la regla
del centavo sobrante (FR-024a) y los pagos ya realizados como categorías ficticias, sin tocar el
algoritmo. Cada cambio que afecta el reparto corre en una transacción que bloquea el grupo y
recalcula las liquidaciones pendientes. Las pagadas (totales o parciales) quedan como historial
inmutable. Una migración nueva agrega `category_participants`, los autores (`createdById`), los
datos del pago (`paidAt`, `paidById`), el orden de las transferencias, la unicidad sin distinguir
mayúsculas y las reglas de borrado en cascada. El requisito pasa a Node 24 LTS, necesario para
que Jest cargue el dominio ESM. La sonda ejecutable de research.md validó el enfoque.

## Technical Context

**Language/Version**: JavaScript sobre **Node.js 24 LTS** (sube desde 22; research R9). El
servidor sigue en CommonJS y carga el dominio del cliente (ESM) con `require()`.

**Primary Dependencies**: las de la Fase 1 (express 5, prisma/@prisma/client 6.19, zod 4,
jsonwebtoken, bcryptjs) + `uuid@10` en el servidor (dependencia transitiva de `Peer.js`, misma
versión mayor que el cliente). Dev: jest 30, supertest.

**Storage**: PostgreSQL 16; una migración nueva con SQL agregado a mano para los índices por
expresión, los CHECK de pago y las reglas `CASCADE` / `NO ACTION` (data-model.md).

**Testing**: Jest + Supertest contra `cuantoes_test`, con `node --experimental-vm-modules`. Unit
tests del adaptador de cálculo, con escenarios de referencia contra la app y propiedades sobre
grupos aleatorios.

**Target Platform**: contenedor Linux (`node:24-alpine`) vía Docker Compose; contexto de build
en la raíz para incluir el dominio del cliente (research R10).

**Project Type**: web service (API REST JSON) junto a la SPA React en el mismo repositorio.

**Performance Goals**: SC-003. Liquidaciones de un grupo de 20 miembros, 10 categorías y 500
gastos en menos de 2 s en el p95. La sonda midió menos de 1 ms por cálculo; el costo está en las
consultas, que se agregan en la base (`SUM … GROUP BY`).

**Constraints**:

- El algoritmo no se modifica (Principio I).
- Los montos nunca pasan por un float en el servidor: viajan como string decimal y se calculan
  en centavos enteros.
- Consultar las liquidaciones no las modifica.
- Los cambios del mismo grupo se serializan con un bloqueo de fila.

**Scale/Scope**: escala académica. 23 operaciones nuevas en 12 rutas, 1 tabla nueva, 1 migración.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| **I. Exactitud del cálculo** | `calculate()` y `distribute()` se reutilizan **sin cambios de lógica**: el servidor carga los mismos archivos (R1) y adapta la entrada (R2, R3). El cálculo oficial es del servidor (FR-026) y se guarda en `DECIMAL(12,2)`. En centavos enteros no hay residuos de punto flotante. Es determinista por el orden fijo de la entrada (R4). El "aporte igual al promedio" se interpreta en centavos con la regla de FR-024a, porque un promedio exacto no siempre es representable en centavos: cada parte es el promedio redondeado hacia abajo, y quien más pagó absorbe los centavos sobrantes (menos que la cantidad de participantes). Con esa parte, los saldos se conservan **exactamente** (FR-023, SC-002) y no quedan deudas residuales. | ✅ PASS |
| **II. Dominio reutilizable / servidor fuente de verdad** | El dominio sigue siendo JS puro en `src/classes` y `src/utils` y corre en ambos lados. Flujo `routes → controllers → models`. El recálculo vive en un solo servicio que usa el adaptador, así que ningún controlador reimplementa el cálculo (R12). La SPA no se toca, salvo las extensiones `.js`. | ✅ PASS |
| **III. Pruebas** | El único cambio en `calculate.js` y en las clases son las extensiones de import. Igual se agregan pruebas de las invariantes del Principio I: conservación de saldos, sin cadenas, redondeo. También los casos borde exigidos: un miembro, gastos iguales, montos en cero, miembros en varias categorías e invitados. Además, la equivalencia con la app (SC-001) y tests de API por historia. El plan de pruebas formal se amplía con los nuevos casos de uso. | ✅ PASS |
| **IV. UX responsive y clara** | Sin UI en esta fase. Mensajes de error en castellano rioplatense. Toda entrada numérica se valida en el servidor. Las eliminaciones son explícitas (una solicitud por recurso) y su efecto se ve de inmediato porque se recalcula en la misma transacción. | ✅ PASS |
| **V. Stack fijo** | Mismo stack. Deps nuevas justificadas: `uuid` (la misma del cliente, que `Peer.js` necesita en el servidor; R1). Node pasa de 22 a 24 LTS: es un problema concreto documentado (Jest no carga ESM en 22; R9), no un cambio de stack. Los cambios al borrador de endpoints de `docs/CLAUDE.md` §5 quedan en `contracts/groups-api.yaml` (R11). | ✅ PASS |
| **VI. Seguridad y privacidad** | Todas las rutas usan `requireAuth`. El acceso a un grupo es para el miembro con cuenta o el dueño (texto v2.1.0); los demás reciben 404, y cada consulta filtra por `groupId` (R11). Los permisos finos (dueño, autor, partes de la liquidación) responden 403. La validación se hace con zod en middleware. No hay servicios externos ni secretos nuevos. | ✅ PASS |
| **VII. Persistencia e historial** | Gastos individuales; participantes por categoría; los resultados de `calculate()` se guardan como `Settlement` con estado pagado o pendiente, y los pagos son historial inmutable. Migración de Prisma versionada nueva, sin editar la de la Fase 1. | ✅ PASS |
| **Restricciones técnicas** | La SPA sigue en la raíz (regla "Transición al monorepo"). `npm run build` del cliente debe pasar sin advertencias nuevas tras las extensiones `.js` (tarea de verificación). | ✅ PASS |
| **Entregables académicos** | Casos de uso nuevos (Crear grupo, Agregar miembro, Gestionar categoría y participantes, Registrar gasto, Consultar liquidaciones, Registrar pago) con sus fichas y diagrama en `docs/entregables/casos-de-uso.md`. Diagrama de clases actualizado (CategoryParticipant, autores, pagos). Casos nuevos en `docs/entregables/plan-de-pruebas.md`. | ✅ PASS (tareas en tasks.md) |
| **Flujo** | Rama `feature/002-groups-expenses-settlements` sobre la Fase 1. `npm test` en `server/` y `npm run build` en la raíz antes del merge. Commits en español e imperativo. | ✅ PASS |

**Re-check post-diseño**: sin violaciones. El diseño confirmó dos detalles que no cambian la
evaluación:

- Las FK hacia miembros y participantes son `NO ACTION` en lugar de `RESTRICT`, para que el
  borrado en cascada no falle según el orden de borrado.
- El servidor depende del `node_modules` de la raíz en el host (por `uuid`); en Docker se
  resuelve con un enlace (R10).

Ninguno de los dos introduce complejidad que haya que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/002-groups-expenses-settlements/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones R1–R13 (sonda del algoritmo incluida)
├── data-model.md        # Fase 1: cambios al modelo, estados de la liquidación, entrada/salida del cálculo
├── quickstart.md        # Fase 1: recorrido manual, tests y rendimiento
├── contracts/
│   └── groups-api.yaml  # Fase 1: OpenAPI de grupos, miembros, categorías, gastos y liquidaciones
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
cuanto-es/
├── .dockerignore                      # NUEVO: contexto de build en la raíz (research R10)
├── docker-compose.yml                 # MODIFICADO: api.build = { context: ., dockerfile: server/Dockerfile }
├── src/                               # SPA (sin cambios de comportamiento)
│   ├── classes/Category.js            # MODIFICADO: imports con extensión .js
│   └── utils/calculate.js             # MODIFICADO: ídem
├── docs/entregables/                  # MODIFICADO: casos de uso, diagrama de clases, plan de pruebas
└── server/
    ├── package.json                   # MODIFICADO: engines >=24, uuid@10, script test con --experimental-vm-modules
    ├── Dockerfile                     # MODIFICADO: node:24-alpine, layout /repo, enlace node_modules
    ├── prisma/
    │   ├── schema.prisma              # MODIFICADO: CategoryParticipant, createdById, paidAt/paidById/position, onDelete
    │   └── migrations/<ts>_groups_expenses_settlements/migration.sql   # NUEVA (+ SQL a mano)
    ├── scripts/settlements-p95.js     # NUEVO: medición de SC-003
    ├── src/
    │   ├── app.js                     # MODIFICADO: monta /groups
    │   ├── domain/
    │   │   └── settlements.js         # NUEVO: adaptador puro → calculate() (R2–R4)
    │   ├── services/
    │   │   └── settlements.service.js # NUEVO: withGroupLock, recalculatePending, getSettlementsView (R5, R12)
    │   ├── lib/money.js               # NUEVO: string decimal ↔ centavos
    │   ├── middleware/loadGroup.js    # NUEVO: acceso al grupo + rol (owner/member) o 404
    │   ├── schemas/                   # NUEVOS: groups, members, categories, expenses, settlements (zod)
    │   ├── controllers/               # NUEVOS: groups, members, categories, expenses, settlements
    │   └── routes/groups.routes.js    # NUEVO: router anidado /groups/:groupId/…
    └── tests/
        ├── setup/db.js                # MODIFICADO: TRUNCATE incluye category_participants
        ├── unit/                      # settlements.domain.test.js, money.test.js
        └── integration/               # groups, members, categories, expenses, settlements, model.phase2
```

**Structure Decision**: se extiende el paquete `server/` de la Fase 1 con la misma organización
(`routes/controllers/models/middleware/schemas/lib`). Se suman `domain/`, para el adaptador puro
que conecta con el dominio del cliente, y `services/`, para el recálculo transaccional que
comparten cinco controladores. El dominio del cliente se usa en su lugar (`src/`) y no se copia.
Cuando la SPA se mude a `client/` (antes del fin de la Fase 3), solo cambia la ruta relativa del
adaptador y la copia del Dockerfile.

### Flujo de una operación que modifica el reparto

```text
request → requireAuth → loadGroup (404 si no tiene acceso; req.group, req.role)
        → validate(schema)                         (400)
        → controller:
            withGroupLock(groupId, async (tx) => {     -- SELECT … FOR UPDATE sobre groups
              verificar permiso fino                   (403)
              escribir (gasto / participante / pago…)  (409 según reglas)
              recalculatePending(tx, groupId)          -- borra pendientes, calcula, inserta
            })
        → respuesta
```

### Notas de implementación relevantes para las tareas

- **Ruta del dominio**: `server/src/domain/settlements.js` hace
  `require('../../../src/utils/calculate.js')` y `require('../../../src/classes/Category.js')`.
  Las exportaciones por defecto llegan como `.default` (`Category.default`).
- **Construcción de categorías**: `new Category([], name, id)`, pasando el `id` para que no se
  llame a `idGenerator`, y `addPerson({ id: memberId, name }, gastoNetoEnCentavos)`.
- **Equivalencia (SC-001)**: el test arma la misma entrada que la app (pesos en float, sin la
  regla del centavo), corre `calculate()` y compara con el adaptador: mismas parejas y montos
  redondeados a centavos, descartando transferencias de menos de un centavo.
- **Pago parcial**: la fila pendiente pasa a `paid = true` con `amount = p` (no se crea otra) y
  después se recalcula (R6).
- **`loadGroup`**: una sola consulta trae el grupo con `ownerId` y la membresía del usuario.
  `req.role = 'owner'` si es dueño (aunque también sea miembro); `'member'` si es miembro con
  cuenta.
- **Errores Prisma nuevos**: `P2002` sobre los índices de nombre o alias → `409` con el código
  correspondiente (en el `errorHandler`, según `meta.target` o el nombre del índice); `P2003` →
  el controlador ya verificó antes, así que queda como `500` para detectar bugs.
- **Fase 1 que cambia**: `server/package.json` (engines, script de test), `Dockerfile`,
  `docker-compose.yml`, README y `specs/001…/quickstart.md`, donde "Node ≥ 22" pasa a "Node ≥ 24".

## Complexity Tracking

Sin violaciones de la constitución.
