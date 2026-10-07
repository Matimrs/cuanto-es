# Research: Backend base y autenticación (Fase 1)

Decisiones técnicas tomadas para resolver las incógnitas del Technical Context. El stack base
(Node + Express, PostgreSQL 16, Prisma, JWT + bcrypt, Docker Compose, Jest + Supertest) viene
fijado por la constitución (Principio V) y por el pedido del usuario; acá solo se deciden los
detalles.

## R1. Versión de Node y sistema de módulos

- **Decision**: Node.js 22 LTS en la imagen Docker (`node:22-alpine`); localmente funciona
  cualquier Node ≥ 22. El paquete `server/` usa **CommonJS** (`require`).
- **Rationale**: 22 es LTS y Prisma y Jest lo soportan sin advertencias. Jest con ESM nativo
  todavía exige `--experimental-vm-modules` y mocks especiales, y eso complica los tests sin
  aportar nada en esta fase.
- **Alternatives considered**: ESM (`"type": "module"`), que facilitaría importar en la Fase 2
  las clases de dominio del cliente, escritas con `import`. Se descarta por ahora: desde
  Node 22.12, `require()` puede cargar módulos ESM sincrónicos, así que la reutilización de
  `calculate.js` se resuelve en la Fase 2 sin condicionar esta.

## R2. Versión de Express

- **Decision**: Express 5.
- **Rationale**: es la versión estable vigente; propaga al manejador de errores los rechazos de
  los handlers `async` sin necesitar `express-async-errors` ni `try/catch` en cada controlador.
- **Alternatives considered**: Express 4 + `express-async-errors` (una dependencia más y una
  versión en mantenimiento).

## R3. Versión de Prisma

- **Decision**: Prisma ORM 6.x (`prisma` + `@prisma/client`, generador `prisma-client-js`),
  con la versión exacta fijada en `package.json`.
- **Rationale**: funciona con CommonJS y JavaScript sin configuración extra, y su
  documentación y ejemplos son los más difundidos, algo valioso para un equipo que recién
  empieza con el ORM.
- **Alternatives considered**: Prisma 7, que obliga a usar adaptadores de driver
  (`@prisma/adapter-pg`), un `prisma.config` y un cliente generado en una ruta propia. Agrega
  piezas sin beneficio para esta fase; la migración puede evaluarse más adelante.

## R4. Hash de contraseñas

- **Decision**: `bcryptjs` (implementación en JavaScript puro del algoritmo bcrypt) con costo
  configurable `BCRYPT_ROUNDS` (12 por defecto, 4 en tests).
- **Rationale**: cumple "bcrypt" de la constitución (mismo algoritmo y formato de hash) sin
  compilación nativa, que suele fallar en Windows (el entorno del equipo) y en imágenes
  `alpine`. Con costo 12 el login tarda unos cientos de ms, dentro de SC-004.
- **Alternatives considered**: `bcrypt` nativo (más rápido pero con `node-gyp`/binarios
  precompilados); `argon2` (fuera del stack decidido).
- **Nota**: bcrypt solo considera los primeros 72 bytes; por eso la spec rechaza contraseñas
  más largas (FR-004) y no las trunca en silencio.

## R5. Tokens de acceso

- **Decision**: `jsonwebtoken`, algoritmo HS256, payload `{ sub: <userId> }`, `expiresIn: '7d'`
  (Clarifications), secreto `JWT_SECRET` de al menos 32 caracteres. La verificación fija
  `algorithms: ['HS256']`. Se envía como `Authorization: Bearer <token>`.
- **Rationale**: es la librería de referencia. Fijar el algoritmo evita ataques de tipo
  `alg: none` o de confusión de algoritmos. Con HS256 alcanza porque el mismo servicio firma y
  verifica.
- **Alternatives considered**: `jose` (más moderna, pero ESM primero); RS256 (innecesario con un
  solo servicio).
- **Consecuencia** (edge case de la spec): si cambia `JWT_SECRET`, todos los tokens emitidos
  dejan de ser válidos, como se espera.

## R6. Validación de entradas

- **Decision**: `zod`, con esquemas por endpoint y un middleware `validate(schema)` que reemplaza
  `req.body` por los datos parseados (descartando campos desconocidos, FR-014) y responde 400
  con detalle por campo en castellano.
- **Rationale**: cumple el Principio VI ("validación en middleware antes de los
  controladores"), funciona en JavaScript sin TypeScript y además normaliza (`trim`,
  `toLowerCase`) en el mismo paso (FR-002).
- **Alternatives considered**: `express-validator` (más verboso y acoplado a Express) o
  validación manual (propensa a errores y difícil de reutilizar en la Fase 2).

## R7. Configuración y secretos

- **Decision**: un módulo `src/config.js` lee las variables (desde `server/.env`, si el archivo
  existe, o desde el entorno del contenedor) y **falla al arrancar** indicando qué clave falta o
  es inválida (FR-025). El archivo se parsea con `util.parseEnv()` de Node y **solo se asignan
  las claves que todavía no están definidas** en `process.env`, de modo que el entorno (el del
  contenedor o el que fijan los tests) siempre tiene prioridad. La aplicación valida
  `DATABASE_URL`, `JWT_SECRET`, `PORT` (3001 por defecto) y `BCRYPT_ROUNDS` (12 por defecto).
- **Claves de `server/.env.example`** (lista única, la misma que en plan.md):
  | Clave | Uso |
  |---|---|
  | `DATABASE_URL` | conexión de la app y de Prisma CLI desde el host (`localhost`) |
  | `DOCKER_DATABASE_URL` | conexión desde el contenedor `api` (host `db`), ver R8 |
  | `TEST_DATABASE_URL` | base `cuantoes_test` para Jest (R9) |
  | `JWT_SECRET` | secreto HS256, mínimo 32 caracteres |
  | `PORT` | puerto de la API (3001) |
  | `BCRYPT_ROUNDS` | costo de bcrypt (12) |
  | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | inicialización del contenedor `db` |
- **Rationale**: evita sumar la dependencia `dotenv`, centraliza la validación y elimina el riesgo
  de que el `.env` pise la base de test y los tests vacíen la base de desarrollo.
- **Alternatives considered**: `dotenv` (innecesario desde Node 20.12).

## R8. Docker Compose y conexión a la base

- **Decision**: se toma el `docker-compose.yml` de `docs/CLAUDE.md` §8 y se le suman tres
  ajustes:
  1. `healthcheck` en `db` (`pg_isready`) y `depends_on: db: condition: service_healthy` en
     `api`, para que las migraciones no fallen porque Postgres todavía no está listo.
  2. Ninguna credencial queda escrita en `docker-compose.yml` (Principio VI, FR-024). `db` toma
     `POSTGRES_*` de `env_file: ./server/.env` (en lugar del bloque `environment` con
     `POSTGRES_PASSWORD` de §8). `api` también usa `env_file` y **no** declara
     `environment: DATABASE_URL`: el `CMD` del contenedor hace
     `export DATABASE_URL="${DOCKER_DATABASE_URL:-$DATABASE_URL}"` antes de arrancar. Así,
     `server/.env` usa `localhost` en `DATABASE_URL` (servidor y tests desde el host) y el host
     `db` en `DOCKER_DATABASE_URL`.
  3. El contenedor `api` ejecuta `npx prisma migrate deploy && node src/index.js` al arrancar,
     de modo que un solo `docker compose up --build` deja todo listo (FR-023, US5).
- **Rationale**: cumple el "un solo paso" de la spec sin duplicar archivos `.env` y sin
  versionar credenciales.
- **Desvío de `docs/CLAUDE.md` §8**: el compose de referencia tiene `POSTGRES_PASSWORD`
  hardcodeado; se reemplaza por `env_file` para cumplir el Principio VI.
- **Agregado en la implementación**: el puerto del host para `db` es `${DB_HOST_PORT:-5432}`.
  Si el 5432 ya está ocupado (por ejemplo, por el Postgres de otro proyecto), se levanta con
  `DB_HOST_PORT=5433 docker compose up` y se ajusta el puerto en `DATABASE_URL` y
  `TEST_DATABASE_URL` de `server/.env`. No afecta a `api`, que usa la red interna (`db:5432`).
- **Alternatives considered**: dos archivos `.env` (`.env` y `.env.docker`), que agregan
  confusión; `environment: DATABASE_URL` en el compose (versiona la contraseña); o correr las
  migraciones a mano (no cumple FR-023).

## R9. Base de datos para tests

- **Decision**: los tests de integración usan una base separada, `cuantoes_test`, en el mismo
  contenedor `db`, a través de `TEST_DATABASE_URL`. Antes de la suite se corre
  `prisma migrate deploy` contra esa base (`globalSetup` de Jest), y entre tests se vacían las
  tablas con `TRUNCATE ... CASCADE`. Los tests corren en serie (`--runInBand`). La base de
  test la crea un script `server/docker/init-test-db.sql` montado en
  `/docker-entrypoint-initdb.d`, que Postgres ejecuta la primera vez que inicializa el volumen.
- **Rationale**: aísla los datos de desarrollo, prueba las migraciones reales (incluidas las
  restricciones `CHECK`) y mantiene la ejecución determinista.
- **Alternatives considered**: mockear Prisma (no prueba las restricciones de integridad,
  SC-008) o usar Testcontainers (más lento y requiere el socket de Docker desde Jest).

## R10. Reglas de integridad que Prisma no expresa

- **Decision**: se agregan con SQL en la migración inicial (las migraciones de Prisma se pueden
  editar antes de aplicarlas):
  - `CHECK (amount > 0)` en `Expense` y en `Settlement`.
  - `CHECK (creditor_id <> debtor_id)` en `Settlement`.
  - `CHECK (user_id IS NOT NULL OR (alias IS NOT NULL AND btrim(alias) <> ''))` en
    `GroupMember`.

  Las reglas de "mismo grupo" (FR-018, FR-019) se resuelven con **claves foráneas compuestas**:
  - `GroupMember` y `Category` declaran `@@unique([id, groupId])`.
  - `Expense` incorpora `groupId` y referencia a `(categoryId, groupId)` y a
    `(paidById, groupId)`.
  - `Settlement` referencia a `(creditorId, groupId)` y a `(debtorId, groupId)`.
- **Rationale**: las reglas quedan garantizadas por la base, sin depender de que cada
  controlador de la Fase 2 las recuerde, y son fáciles de probar (SC-008).
- **Alternatives considered**: validar solo en la aplicación (frágil: un controlador futuro
  podría olvidarlo) o usar triggers (más complejos de mantener y de explicar en el informe).
- **Desvío del modelo de `docs/CLAUDE.md`**: `Expense` agrega `group_id` (redundante con la
  categoría) para poder declarar las claves compuestas. Queda documentado en `data-model.md`.

## R11. Identificadores

- **Decision**: UUID v4 (`@default(uuid())`) en todas las entidades.
- **Rationale**: no permiten adivinar cuántos usuarios o grupos hay ni recorrerlos por número
  (útil para los enlaces de la Fase 6), y Prisma los genera solo.
- **Alternatives considered**: enteros autoincrementales (más legibles, pero predecibles).

## R12. Formato de errores y logging

- **Decision**: todas las respuestas de error usan
  `{ "error": { "code": "<CODIGO>", "message": "<texto en castellano>", "fields"?: {...} } }`.
  Un manejador central traduce:
  - errores de validación → 400 `VALIDATION_ERROR`;
  - `P2002` sobre `email` → 409 `EMAIL_TAKEN`;
  - errores de conexión de Prisma (`P1001`, `PrismaClientInitializationError`) → 503
    `SERVICE_UNAVAILABLE`;
  - cualquier otro → 500 `INTERNAL_ERROR`.

  Los errores se registran con `console.error` (método, ruta y stack), **nunca** el cuerpo de la
  solicitud (FR-005).
- **Rationale**: le da al cliente un contrato estable para la Fase 3 y cumple FR-013.
- **Alternatives considered**: `morgan` o `pino` para logs de acceso. Quedan para cuando haga
  falta (YAGNI).

## R13. Concurrencia en el registro

- **Decision**: no se consulta "¿existe el email?" antes de insertar. Se inserta directamente y
  se traduce la violación de unicidad (`P2002`) a 409.
- **Rationale**: es la única forma de garantizar una sola cuenta ante solicitudes simultáneas
  (FR-003, SC-002); una consulta previa deja abierta una carrera.

## R14. Fuera de esta fase (confirmado)

- CORS: el frontend todavía no consume la API (llega en la Fase 3). No se habilita.
- Rate limiting, verificación de email, recuperación de contraseña y refresh tokens: fuera de
  alcance según la spec.
- Reutilización de `calculate.js` en el servidor: Fase 2.
