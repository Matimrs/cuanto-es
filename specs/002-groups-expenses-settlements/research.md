# Research: Grupos, gastos y liquidaciones en el servidor (Fase 2)

Decisiones técnicas de la Fase 2. El stack de la Fase 1 se mantiene (Express 5, Prisma 6,
PostgreSQL 16, zod, Jest + Supertest; ver `specs/001-backend-auth-base/research.md`). Acá se
decide cómo reutilizar el algoritmo del cliente y cómo modelar participantes, pagos y recálculo.

Las decisiones R1–R4 se validaron con una sonda ejecutable (2026-10-07) sobre una copia de
`src/classes` y `src/utils`: los escenarios de la spec dieron el resultado esperado, un ciclo de
deudas terminó sin transferencias y 3000 grupos aleatorios (2–8 miembros, 1–4 categorías, hasta
2 pagos) dieron montos enteros en centavos y saldos netos exactos, en menos de 1 ms cada uno.

## R1. Reutilizar `calculate()` y `Category.distribute()` desde el servidor

- **Decision**: el servidor carga **los mismos archivos** del cliente (`src/utils/calculate.js`,
  `src/classes/Category.js`, `src/classes/Peer.js`) con `require()` de módulos ES, que Node
  admite sin banderas desde la 22.12. El único cambio en el cliente es agregar la extensión `.js`
  a tres imports relativos (en `Category.js` y `calculate.js`; `Person.js` ya la tiene) (`"../classes/Peer"` → `"../classes/Peer.js"`, ídem `idGenerator`),
  porque Node exige especificadores completos y webpack (CRA) los acepta igual.
- **Rationale**: cumple el Principio I ("DEBEN reutilizarse; NO DEBEN reescribirse") y el II
  ("el mismo código corre en el cliente y en el servidor") sin copiar archivos que podrían
  divergir. El cambio no toca ninguna línea de lógica.
- **Alternatives considered**: copiar los archivos a `server/` (duplica el algoritmo y diverge);
  mover el dominio a un paquete compartido (`shared/`), que CRA no puede importar fuera de `src/`
  sin configurar un paquete local (más cambios en el cliente, que esta fase no toca); reescribir
  en CommonJS (prohibido por el Principio I).
- **Dependencia transitiva**: `Peer.js` importa `uuid`. En el host lo resuelve el
  `node_modules` de la raíz (dependencia de la SPA), así que los tests del servidor necesitan
  también `npm install` en la raíz. En Docker se agrega `uuid@10` (la misma versión mayor que el
  cliente) a `server/package.json` y se enlaza (R9). No se reemplaza por `crypto.randomUUID()`
  porque no existe en contextos HTTP no seguros (la SPA abierta desde el celular por la IP de la
  red local).

## R2. Adaptar la entrada: centavos enteros y la regla del centavo sobrante

- **Decision**: el adaptador (`server/src/domain/settlements.js`) arma, por categoría, una
  `Category` cuyos `persons` llevan como `gasto` el **saldo neto en centavos enteros** de cada
  participante: `pagado − parte`, donde la parte sigue FR-024a (total ÷ n redondeado hacia
  abajo; los centavos sobrantes se suman a la parte de quien más pagó, con empate el que se sumó
  primero a la categoría). Como la suma es 0, `average()` da exactamente 0 y `distribute()`
  produce montos enteros.
- **Rationale**: es "adaptar la entrada, no el algoritmo" (Principio I). Al trabajar en enteros
  desaparecen los residuos de punto flotante (`0.000001`) y las comparaciones de igualdad de
  `deleteChain` (`peer1.amount === peer2.amount`) se vuelven exactas.
- **Equivalencia con la app (FR-022, SC-001)**: pasar `pagado − parte` en lugar de `pagado`
  desplaza a todos los participantes de una categoría por la misma constante (el promedio), así
  que `distribute()` genera las mismas parejas en el mismo orden; solo cambia el redondeo. La
  excepción es quien pagó a menos de un centavo del promedio: la app lo trata como deudor de una
  fracción de centavo y el servidor como saldado, lo que coincide con descartar las
  transferencias de menos de un centavo. Los
  tests de equivalencia corren el algoritmo con la entrada original de la app (montos en pesos,
  float) y comparan contra el resultado del servidor, redondeando a centavos y descartando las
  transferencias de menos de un centavo que la app genera por errores de punto flotante.
- **Alternatives considered**: llamar a `calculate()` con pesos en float y redondear al final
  (no garantiza la suma exacta ni la regla del centavo, y arrastra residuos); redondear dentro de
  `distribute()` (modifica el algoritmo).

## R3. Pagos realizados como datos de entrada (FR-027a)

- **Decision**: cada liquidación pagada se pasa a `calculate()` como una categoría ficticia de
  dos personas: el deudor con `+monto` y el acreedor con `−monto`. `distribute()` genera la
  transferencia inversa (el acreedor "le debe" al deudor lo ya pagado) y la unificación de pagos
  la compensa contra la deuda original. Si lo pagado supera lo que se debía, queda una
  transferencia en sentido inverso; la eliminación de cadenas puede redirigirla a un tercero sin
  alterar ningún saldo neto.
- **Rationale**: incorpora los pagos sin tocar el algoritmo (Assumptions de la spec) y conserva
  los saldos netos (SC-002, SC-007).
- **Alternatives considered**: restar los pagos del resultado de `calculate()` a mano (es
  reimplementar la unificación); excluir del cálculo a quienes ya pagaron (incorrecto si cambian
  los gastos).

## R4. Orden determinista de la entrada (FR-025)

- **Decision**: las categorías entran ordenadas por `createdAt, id`; dentro de cada una, los
  participantes por fecha de alta en la categoría (`createdAt, id`); los pagos, después de todas
  las categorías, por `paidAt, id`. Las transferencias resultantes se guardan con un número de
  orden (`position`) y se devuelven en ese orden.
- **Rationale**: `calculate()` es determinista para una entrada dada; fijar el orden de la
  entrada lo vuelve determinista frente a la base de datos.

## R5. Cuándo se recalculan las pendientes (FR-027, FR-027c)

- **Decision**: toda operación que cambia algo que afecta al reparto (gastos, participantes,
  categorías, miembros, pagos) corre dentro de una **transacción interactiva** de Prisma que,
  antes de escribir, bloquea la fila del grupo (`SELECT … FROM groups WHERE id = $1 FOR UPDATE`)
  y, después de escribir, llama a `recalculatePending(tx, groupId)`: borra las liquidaciones
  pendientes del grupo, recalcula (R2–R4) e inserta las nuevas. `GET …/settlements` solo lee.
- **Rationale**: las pendientes quedan estables entre cambios (mismos identificadores), la
  consulta no tiene efectos secundarios y el bloqueo por grupo serializa dos cambios simultáneos
  del mismo grupo, que de otro modo podrían recalcular sobre datos viejos.
- **Liquidación reemplazada**: si se pide pagar una liquidación que ya no es una pendiente vigente
  del grupo (porque un recálculo la reemplazó), se responde `409 SETTLEMENT_CHANGED`. Si el
  usuario no tiene acceso al grupo, `404` como siempre (FR-002).
- **Alternatives considered**: recalcular en cada consulta (rechazado en Clarifications);
  recalcular en segundo plano (eventual, agrega infraestructura).

## R6. Pagos parciales y "volver a pendiente" (FR-028, FR-028a)

- **Decision**: registrar un pago sobre una pendiente de monto `M` con monto `p ≤ M` actualiza esa
  fila a `paid = true`, `amount = p`, `paidAt = now()`, `paidById = usuario` y luego recalcula
  (el resto `M − p` reaparece como pendiente). Volver a pendiente **borra** la fila pagada y
  recalcula: el monto vuelve a formar parte del cálculo.
- **Rationale**: un pago parcial es simplemente una liquidación pagada por menos; no hace falta
  una entidad "pago" aparte. Borrar en lugar de poner `paid = false` evita dejar una pendiente
  "huérfana" que el recálculo igual reemplazaría.
- **Endpoint**: `PATCH /groups/:groupId/settlements/:settlementId` con `{ "paid": true,
  "amount"?: "60.00" }` o `{ "paid": false }`.

## R7. Participantes de categoría y reglas en la base

- **Decision**: nueva tabla `category_participants (id, category_id, group_id, member_id,
  created_at)` con FK compuestas `(category_id, group_id)` → `categories` y
  `(member_id, group_id)` → `group_members`, y `UNIQUE (category_id, member_id)`. El gasto
  referencia al participante con una FK compuesta `(category_id, paid_by_id)` →
  `category_participants (category_id, member_id)` con `ON DELETE NO ACTION` (ver R8).
- **Rationale**: la base garantiza FR-018 (quien paga es participante de esa categoría y del
  mismo grupo) y FR-015a (no se puede quitar a un participante con gastos) sin depender de que
  cada controlador lo verifique, igual que en la Fase 1 (R10 de la 001).
- **Alternatives considered**: validar solo en la aplicación (frágil).

## R8. Unicidad sin distinguir mayúsculas y reglas de borrado

- **Decision**: los nombres de categoría y los alias se guardan recortados y la unicidad sin
  distinguir mayúsculas se garantiza con índices únicos por expresión agregados a mano en la
  migración: `UNIQUE (group_id, lower(name))` en `categories` y
  `UNIQUE (group_id, lower(alias)) WHERE user_id IS NULL` en `group_members` (Prisma no expresa
  índices por expresión ni parciales). Se reemplaza el `@@unique([groupId, name])` de la Fase 1.
- **Borrados** (la Fase 1 dejó todo en `RESTRICT`): grupo → `CASCADE` a miembros, categorías,
  participantes, gastos y liquidaciones; categoría → `CASCADE` a participantes y gastos; miembro
  → `CASCADE` a sus participaciones, `NO ACTION` desde gastos y liquidaciones (el controlador
  borra antes las pendientes del miembro y rechaza con `409` si tiene gastos o pagos);
  participante → `NO ACTION` desde gastos. `users` sigue en `RESTRICT` (no hay borrado de
  cuentas).
- **`NO ACTION` en lugar de `RESTRICT`** en las FK de gastos y liquidaciones hacia miembros y
  participantes: `RESTRICT` se chequea en el momento y haría fallar el borrado en cascada de un
  grupo o una categoría según el orden interno de borrado; `NO ACTION` se chequea al final de la
  sentencia. Borrar un miembro o un participante con gastos sigue fallando.
- **Rationale**: los borrados en cascada que pide la spec (FR-007, FR-014) quedan en la base y
  los rechazos (FR-012, FR-015a) también.

## R9. Node 24 LTS y carga de ESM en Jest

- **Decision**: se sube el requisito a **Node.js 24 LTS** (imagen `node:24-alpine`,
  `"engines": { "node": ">=24" }`) y el script de test pasa a
  `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand`.
- **Rationale**: Jest 30 solo carga módulos ES con `require()` de forma nativa en Node ≥ 24.9 y
  con la bandera de módulos VM (probado: sin la bandera falla con "Must use import to load ES
  Module"; con ella pasa). Node 24 es la LTS activa; 22 pasó a mantenimiento. Invocar el binario
  de Jest con `node` evita depender de `NODE_OPTIONS`, cuya sintaxis cambia entre Windows y Unix.
- **Alternatives considered**: transformar los archivos del cliente con `babel-jest` (suma
  `@babel/core` y presets al servidor); seguir en Node 22 (Jest no carga el dominio).

## R10. Docker con el dominio del cliente

- **Decision**: el servicio `api` pasa a construirse con el contexto en la raíz
  (`build: { context: ., dockerfile: server/Dockerfile }`) para poder copiar `src/classes` y
  `src/utils` a la imagen. Dentro, el layout replica el del repo (`/repo/server`,
  `/repo/src/classes`, `/repo/src/utils`) y `/repo/node_modules` es un enlace a
  `/repo/server/node_modules`, donde está `uuid`. Un `.dockerignore` en la raíz deja afuera
  `node_modules`, `build`, `.git`, `server/.env` y todo lo que no sea `server/` y el dominio.
- **Rationale**: la ruta relativa `../../../src/utils/calculate.js` es la misma en el host y en
  el contenedor, sin configuraciones por entorno.

## R11. Rutas y contrato

- **Decision**: todas las rutas nuevas cuelgan de `/groups/:groupId/…` (miembros, categorías,
  participantes, gastos, liquidaciones). Un middleware `loadGroup` resuelve el grupo y el rol del
  usuario (`owner`, `member` o ninguno → `404`) una sola vez; cada consulta filtra además por
  `groupId`, lo que impide acceder a un recurso de otro grupo cambiando un identificador (FR-002).
  Se desvía del borrador de `docs/CLAUDE.md` §5 (`/categories/:id/expenses`,
  `PATCH /settlements/:id`), que el Principio V permite si queda documentado en el contrato.
- **Montos**: en la API viajan como **string decimal** (`"15000.50"`); en la entrada también se
  acepta un número JSON, que se valida contra `^\d{1,10}(\.\d{1,2})?$` (más de 2 decimales →
  `400`, FR-017). Así ningún monto pasa por un float en el servidor.
- **Fechas de gasto**: `YYYY-MM-DD`.
- **Errores nuevos**: `403 FORBIDDEN` (tiene acceso pero no permiso, FR-003, FR-003a, FR-028),
  `409 ALREADY_MEMBER`, `409 ALIAS_TAKEN`, `409 CATEGORY_NAME_TAKEN`,
  `409 MEMBER_HAS_EXPENSES`, `409 MEMBER_HAS_PAYMENTS`, `409 PARTICIPANT_HAS_EXPENSES`,
  `409 SETTLEMENT_CHANGED`, `409 SETTLEMENT_ALREADY_PAID`, `422 USER_NOT_FOUND` (email sin cuenta
  al agregar un miembro).

## R12. Capas del servidor

- **Decision**: se mantienen `routes/ → controllers/ → models/` (Principio II) y se agregan:
  - `src/domain/settlements.js`: adaptador puro (sin Prisma ni Express) que recibe gastos
    agregados, participantes y pagos, y devuelve transferencias y saldos usando `calculate()`.
  - `src/services/settlements.service.js`: `recalculatePending(tx, groupId)` y la lectura de
    saldos. Lo llaman todos los controladores que modifican el reparto.
  - `src/lib/money.js`: conversión entre string decimal y centavos enteros.
- **Rationale**: el recálculo se usa desde cinco controladores distintos; tenerlo en un solo
  lugar evita duplicar lógica (y que un controlador "reimplemente cálculos de dominio", que el
  Principio II prohíbe).

## R13. Fuera de esta fase (confirmado)

- Cambios en la SPA más allá de las extensiones de R1; consumo de la API (Fase 3).
- Historial de gastos de todo el grupo (sin filtrar por categoría): queda para el dashboard
  (Fase 4).
- Vincular un invitado con una cuenta, transferir la propiedad y salir de un grupo.
