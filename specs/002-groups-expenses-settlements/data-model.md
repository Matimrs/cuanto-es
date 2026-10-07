# Data Model: Grupos, gastos y liquidaciones en el servidor (Fase 2)

Evolución del modelo de la Fase 1 (`specs/001-backend-auth-base/data-model.md`). Convenciones
iguales: UUID, camelCase en Prisma mapeado a snake_case, montos `DECIMAL(12,2)` en ARS. Los
cambios se aplican con **una migración nueva** (`<ts>_groups_expenses_settlements`), sin editar
la migración inicial. **[SQL]** marca lo que se agrega a mano en esa migración (research R7, R8).

## Diagrama de relaciones

```text
User 1 ──── * Group                 (owner)
User 0..1 ── * GroupMember          (nulo = invitado)
User 1 ──── * Category              (createdBy)              ← NUEVO
User 1 ──── * Expense               (createdBy)              ← NUEVO
User 0..1 ── * Settlement           (paidBy)                 ← NUEVO
Group 1 ─── * GroupMember / Category / Expense / Settlement / CategoryParticipant
Category 1 ─ * CategoryParticipant * ─ 1 GroupMember         ← NUEVO
CategoryParticipant 1 ─ * Expense   (quien pagó es participante de la categoría)
GroupMember 1 ─ * Settlement        (creditor / debtor)
```

## Cambios por entidad

### User — sin cambios

Se suman las relaciones inversas `categoriesCreated`, `expensesCreated` y `paymentsMarked`.

### Group — sin cambios de columnas

- Borrado: `CASCADE` hacia `group_members`, `categories`, `category_participants`, `expenses` y
  `settlements` (FR-007). Antes era `RESTRICT`.

### GroupMember — reglas nuevas

| Campo | Cambio |
|---|---|
| alias | se guarda recortado (`trim`) |

- **[SQL]** `CREATE UNIQUE INDEX group_members_group_alias_ci ON group_members (group_id,
  lower(alias)) WHERE user_id IS NULL` — alias de invitados únicos sin distinguir mayúsculas
  (FR-009).
- Se mantiene `@@unique([groupId, userId])` (FR-010) y el CHECK de alias de la Fase 1.
- Borrado: `CASCADE` hacia `category_participants`; `NO ACTION` desde `expenses` (vía
  participante) y `settlements`. El controlador borra antes las pendientes que lo incluyen y
  rechaza si tiene gastos (`MEMBER_HAS_EXPENSES`) o pagos (`MEMBER_HAS_PAYMENTS`) (FR-012).
- **Nombre visible** (FR-011): `user.name` si `userId` no es nulo; si no, `alias`. Se calcula al
  responder, no se guarda.

### Category — columna nueva

| Campo | Tipo | Reglas |
|---|---|---|
| createdById | UUID | FK → `users.id`, obligatorio (FR-003a) — **NUEVO** |
| name | VARCHAR(100) | se guarda recortado |

- **[SQL]** `CREATE UNIQUE INDEX categories_group_name_ci ON categories (group_id, lower(name))`
  (FR-013). Reemplaza a `@@unique([groupId, name])` de la Fase 1, que se elimina.
- Se mantiene `@@unique([id, groupId])`.
- Borrado: `CASCADE` hacia `category_participants` y `expenses` (FR-014).

### CategoryParticipant (`category_participants`) — NUEVA

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| categoryId | UUID | FK compuesta `(categoryId, groupId)` → `categories(id, group_id)`, `CASCADE` |
| groupId | UUID | redundante, para las FK compuestas |
| memberId | UUID | FK compuesta `(memberId, groupId)` → `group_members(id, group_id)`, `CASCADE` |
| createdAt | TIMESTAMPTZ | `now()`; define el orden de alta (FR-024a, research R4) |

- `@@unique([categoryId, memberId])`: destino de la FK de `Expense` y sin duplicados.
- Al crear una categoría se insertan sus participantes (los indicados o, si no se indican, todos
  los miembros del grupo en ese momento) en la misma transacción (FR-015). Debe quedar al menos
  uno: quitar al último participante se rechaza (`400`).

### Expense — columna nueva y FK nueva

| Campo | Tipo | Reglas |
|---|---|---|
| createdById | UUID | FK → `users.id`, obligatorio (FR-003a) — **NUEVO** |
| amount | DECIMAL(12,2) | `> 0` (CHECK de la Fase 1); máximo 9.999.999.999,99 por el tipo; la API rechaza más de 2 decimales (FR-017) |
| description | VARCHAR(200)? | recortada; vacía → `null` |

- **FK nueva**: `(categoryId, paidById)` → `category_participants(category_id, member_id)`,
  `NO ACTION` — quien pagó es participante de esa categoría (FR-018) y un participante con gastos
  no se puede quitar (FR-015a).
- **`NO ACTION` y no `RESTRICT`** en las FK de `expenses` y `settlements` hacia miembros y
  participantes: PostgreSQL chequea `RESTRICT` en el momento, así que el borrado en cascada de un
  grupo o una categoría podría fallar según el orden en que borra las filas; `NO ACTION` chequea
  al final de la sentencia, cuando los gastos y liquidaciones ya se borraron en cascada. Borrar
  solo un miembro o un participante con gastos sigue fallando, como se busca. Se conservan las FK compuestas de la Fase 1 hacia `categories` y
  `group_members` (mismo grupo).
- Índice nuevo `(groupId)` para las consultas del recálculo.

### Settlement — columnas nuevas

| Campo | Tipo | Reglas |
|---|---|---|
| paidAt | TIMESTAMPTZ? | se completa al registrar el pago — **NUEVO** |
| paidById | UUID? | FK → `users.id`; quién registró el pago (FR-028) — **NUEVO** |
| position | INT | orden de la transferencia dentro del cálculo (research R4) — **NUEVO** |

- **[SQL]** `CHECK (paid = (paid_at IS NOT NULL))` y `CHECK (paid = (paid_by_id IS NOT NULL))`.
- Se mantienen los CHECK `amount > 0` y `creditor_id <> debtor_id`, y las FK compuestas.
- Índice `(groupId, paid)`.

## Estados de una liquidación

```text
           recálculo (R5)
   ┌──────────────────────────┐
   ▼                          │ (se borra y se reemplaza)
PENDIENTE ──── pagar(p ≤ M) ────► PAGADA (amount = p, paidAt, paidById)
   ▲                                  │
   └──── volver a pendiente ──────────┘  (la fila pagada se borra y se recalcula; research R6)
```

- Las **pendientes** son el resultado del último recálculo: se borran e insertan juntas dentro
  de la transacción de cada cambio (FR-027). Entre cambios conservan id, monto y `position`.
- Las **pagadas** no se modifican nunca; son la entrada "pagos realizados" del cálculo
  (FR-027a, research R3).

## Entrada y salida del cálculo (adaptador `src/domain/settlements.js`)

| Entrada | Origen | Orden (R4) |
|---|---|---|
| categorías con participantes y lo pagado por cada uno (centavos) | `categories` + `category_participants` + `SUM(expenses.amount)` agrupado por `(category_id, paid_by_id)` | categorías por `createdAt, id`; participantes por `createdAt, id` |
| pagos realizados (deudor, acreedor, centavos) | `settlements WHERE paid` | `paidAt, id` |

| Salida | Uso |
|---|---|
| transferencias `{ debtorId, creditorId, cents }` en orden | se insertan como pendientes con `position` |
| saldos por miembro: aportado, parte, pagos enviados, pagos recibidos, pendiente neto | respuesta de `GET /groups/:id/settlements` (FR-027b) |

## Trazabilidad con la spec

| Regla | Dónde se garantiza |
|---|---|
| FR-002 (acceso) | middleware `loadGroup` + filtro por `groupId` en todas las consultas |
| FR-003, FR-003a, FR-028 (permisos) | controladores: `owner` / `createdById` / deudor-acreedor con cuenta |
| FR-007, FR-014 (borrado en cascada) | FK con `ON DELETE CASCADE` |
| FR-009 (alias únicos) | índice único parcial por expresión **[SQL]** |
| FR-012 (quitar miembro) | FK `NO ACTION` + verificación previa con `409` |
| FR-013 (nombre de categoría único) | índice único por expresión **[SQL]** |
| FR-015, FR-015a, FR-018 (participantes) | `category_participants` + FK `(category_id, paid_by_id)` |
| FR-017 (montos) | validación zod (2 decimales, máximo) + `DECIMAL(12,2)` + CHECK |
| FR-021 a FR-025 (cálculo) | `calculate()` del cliente + adaptador en centavos (R1–R4) |
| FR-027, FR-027c (recálculo) | `recalculatePending` en la transacción de cada cambio + bloqueo del grupo (R5) |
| FR-027a, FR-028a (pagos) | filas pagadas inmutables como entrada del cálculo (R3, R6) |
