# Data Model: Backend base y autenticación (Fase 1)

Modelo persistido en PostgreSQL 16 mediante Prisma. Los campos se nombran en camelCase en
Prisma y se mapean a snake_case en la base (`@map`/`@@map`), siguiendo `docs/CLAUDE.md` §4.
Todos los identificadores son UUID (research R11). Las reglas marcadas como **[SQL]** se agregan
a mano en la migración inicial porque Prisma no las expresa (research R10).

## Diagrama de relaciones

```text
User 1 ──── * Group            (owner: el dueño no necesita ser miembro)
User 1 ──── * GroupMember      (opcional: los invitados no tienen User)
Group 1 ─── * GroupMember
Group 1 ─── * Category
Group 1 ─── * Expense          (groupId redundante, para las FK compuestas)
Group 1 ─── * Settlement
Category 1 ─ * Expense
GroupMember 1 ─ * Expense      (paidBy)
GroupMember 1 ─ * Settlement   (creditor / debtor)
```

## Entidades

### User (`users`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | obligatorio, 1–100 caracteres después de `trim` (FR-004) |
| email | VARCHAR(254) | obligatorio, **único**, se guarda normalizado (`trim` + minúsculas, FR-002) |
| passwordHash | VARCHAR(60) | hash bcrypt; nunca se expone en respuestas (FR-005) |
| createdAt | TIMESTAMPTZ | `now()` |
| updatedAt | TIMESTAMPTZ | `@updatedAt` |

- La contraseña en claro se valida en la aplicación (mínimo 8 **caracteres**, máximo 72 **bytes** UTF-8) y nunca llega a la
  base de datos.
- Vista pública (`UserPublic`): `{ id, name, email }`.

### Group (`groups`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | obligatorio |
| ownerId | UUID | FK → `users.id`, obligatorio (FR-021) |
| createdAt | TIMESTAMPTZ | `now()` |

- El dueño **no** tiene que ser miembro (Clarifications). Para pagar gastos o aparecer en
  liquidaciones necesita además una fila en `GroupMember`.

### GroupMember (`group_members`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| groupId | UUID | FK → `groups.id` |
| userId | UUID? | FK → `users.id`, **nullable** (invitado sin cuenta) |
| alias | VARCHAR(100)? | nombre visible; obligatorio si `userId` es nulo |
| createdAt | TIMESTAMPTZ | `now()` |

- `@@unique([groupId, userId])`: un usuario no puede figurar dos veces en el mismo grupo
  (FR-016). PostgreSQL admite varios `NULL`, así que puede haber varios invitados.
- `@@unique([id, groupId])`: destino de las claves foráneas compuestas.
- **[SQL]** `CHECK (user_id IS NOT NULL OR (alias IS NOT NULL AND btrim(alias) <> ''))`.

### Category (`categories`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| groupId | UUID | FK → `groups.id` |
| name | VARCHAR(100) | obligatorio |
| createdAt | TIMESTAMPTZ | `now()` |

- `@@unique([groupId, name])`: un nombre no se repite dentro del grupo (FR-020).
- `@@unique([id, groupId])`: destino de la FK compuesta desde `Expense`.

### Expense (`expenses`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| groupId | UUID | FK → `groups.id` (**agregado** respecto de `docs/CLAUDE.md`) |
| categoryId | UUID | FK compuesta `(categoryId, groupId)` → `categories(id, groupId)` |
| paidById | UUID | FK compuesta `(paidById, groupId)` → `group_members(id, groupId)` |
| amount | DECIMAL(12,2) | ARS (Clarifications); **[SQL]** `CHECK (amount > 0)` (FR-017) |
| description | VARCHAR(200)? | opcional |
| date | DATE | fecha del gasto |
| createdAt | TIMESTAMPTZ | `now()` |

- Las FK compuestas garantizan que la categoría y quien pagó sean del mismo grupo (FR-019).
- Índice en `(categoryId)` para la consulta agrupada por categoría de la Fase 2.

### Settlement (`settlements`)

| Campo | Tipo | Reglas |
|---|---|---|
| id | UUID | PK |
| groupId | UUID | FK → `groups.id` |
| creditorId | UUID | FK compuesta `(creditorId, groupId)` → `group_members(id, groupId)` |
| debtorId | UUID | FK compuesta `(debtorId, groupId)` → `group_members(id, groupId)` |
| amount | DECIMAL(12,2) | ARS; **[SQL]** `CHECK (amount > 0)` |
| paid | BOOLEAN | `false` por defecto (FR-018) |
| createdAt | TIMESTAMPTZ | `now()` |

- **[SQL]** `CHECK (creditor_id <> debtor_id)` (FR-018).

## Reglas de borrado

En esta fase no hay operaciones de borrado. Todas las FK usan `onDelete: Restrict` (la opción
más segura). La Fase 2 decide qué relaciones se borran en cascada.

## Estados

- **Settlement.paid**: `false` (pendiente) → `true` (pagada). La transición la expone la Fase 2
  (`PATCH /settlements/:id`). En esta fase solo existe el campo.
- **User**: sin estados (no hay verificación de email ni bloqueo de cuentas en esta fase).

## Correspondencia con el dominio existente

| Clase del cliente | Entidad persistida | Nota |
|---|---|---|
| `Person` | `GroupMember` (+ `User` opcional) | `alias` ocupa el lugar de `Person.name` en los invitados |
| `Category` | `Category` | el `persons[].gasto` agregado pasa a ser la suma de los `Expense` del miembro |
| `Peer` | `Settlement` | creditor / debtor / amount, más el estado `paid` |

## Trazabilidad con la spec

| Regla | Dónde se garantiza |
|---|---|
| FR-002, FR-003 | normalización en el esquema zod + `@unique` en `email` |
| FR-016 | `@@unique([groupId, userId])` + CHECK de alias |
| FR-017 | `DECIMAL(12,2)` + CHECK `amount > 0` |
| FR-018 | FK compuestas + CHECK `creditor <> debtor` + `paid` con valor por defecto `false` |
| FR-019 | FK compuestas de `Expense` |
| FR-020 | `@@unique([groupId, name])` |
| FR-021 | `ownerId` obligatorio, sin exigir que el dueño sea miembro |
| FR-022 | `prisma migrate` (carpeta `server/prisma/migrations/` versionada) |
