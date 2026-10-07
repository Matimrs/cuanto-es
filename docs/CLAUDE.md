# CuantoEs — Contexto del proyecto

> Este archivo es el punto de partida para trabajar con Claude Code en este repositorio.
> Léelo antes de tocar código: resume de dónde viene el proyecto, hacia dónde va, y qué
> restricciones académicas hay que respetar en el camino.

## 1. Qué es esto

**CuantoEs** (nombre de propuesta: *"Plataforma web para la gestión y distribución de
gastos compartidos entre grupos de usuarios"*) es el proyecto integrador de la materia
**Seminario Integrador** (UTN FRSF, Analista Desarrollador Universitario de Sistemas de
Información). Nace de una app previa del autor (`Distribution`, un divisor de gastos en
React sin backend) que ahora se va a convertir en un sistema de información completo:
con usuarios, persistencia, historial y medios de pago reales.

## 2. Estado actual

- `client/` — la app React original. **Funciona y no hay que rehacerla desde cero.**
  Contiene:
  - `src/classes/Category.js`, `Person.js`, `Peer.js` — modelo de dominio.
  - `src/utils/calculate.js` — algoritmo de neteo y simplificación de deudas (con
    resolución de cadenas). Es la pieza más valiosa del proyecto, no reinventar.
  - Context API (`PersonContext`, `CategoryContext`, `ResultContext`) manejando todo en
    memoria (`useState`). **Esto es lo que hay que reemplazar por llamadas a la API.**
  - No tiene tests, ni backend, ni concepto de "grupo/evento" — todo vive en una sesión
    implícita única.
- `server/` — **no existe todavía.** Es lo primero a construir.

## 3. Arquitectura objetivo

Monorepo con dos paquetes:

```
cuanto-es/
├── client/                 # React (existente, se irá adaptando)
├── server/                 # Node + Express (nuevo)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/         # Prisma schema + client
│   │   ├── middleware/     # auth (JWT), validación
│   │   └── index.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── docker-compose.yml
└── CLAUDE.md
```

**Stack decidido** (no rediscutir salvo que surja un problema concreto):

| Capa | Tecnología | Motivo |
|---|---|---|
| Backend | Node.js + Express | Mismo lenguaje que el frontend, cero fricción de contexto para el equipo |
| Base de datos | PostgreSQL | Modelo relacional, mapea directo al ERD/diagrama de clases que pide la cátedra |
| ORM | Prisma | Migraciones + tipado, evita SQL a mano en un proyecto con tiempos ajustados |
| Auth | JWT + bcrypt | Estándar, sin sesiones server-side |
| Contenedores | Docker Compose (servicios `api` + `db`) | El frontend sigue corriendo nativo con `npm start` |
| Pagos | SDK oficial de Mercado Pago (Node) | Liquidación real de deudas entre usuarios |

## 4. Modelo de datos

Reemplaza el modelo "gasto agregado por persona y categoría" actual por **gastos
individuales registrados uno por uno** (más real, y genera el historial que se busca).

| Entidad | Campos clave | Notas |
|---|---|---|
| `User` | id, name, email, password_hash | Cuenta real, con login |
| `Group` | id, name, owner_id (FK User) | Reemplaza la "sesión implícita" actual |
| `GroupMember` | id, group_id, user_id (nullable), alias | Permite invitados sin cuenta, como hoy |
| `Category` | id, group_id, name | Igual que la clase `Category` actual |
| `Expense` | id, category_id, paid_by (FK GroupMember), amount, description, date | Nuevo: gasto individual, no agregado |
| `Settlement` | id, group_id, creditor_id, debtor_id, amount, paid | Resultado persistido de `calculate()`, con estado pagado/pendiente |

`Category.distribute()` y `utils/calculate.js` se **reutilizan tal cual** en el backend:
en vez de operar sobre un array en memoria, van a operar sobre lo que devuelva la
consulta a `Expense` agrupada por categoría.

## 5. API (borrador de endpoints)

```
POST   /auth/register
POST   /auth/login

GET    /groups                     # grupos del usuario autenticado
POST   /groups
GET    /groups/:id
POST   /groups/:id/members

GET    /groups/:id/categories
POST   /groups/:id/categories

POST   /categories/:id/expenses
GET    /categories/:id/expenses

GET    /groups/:id/settlements      # corre calculate() y devuelve el estado actual
PATCH  /settlements/:id             # marcar como pagado

GET    /groups/:id/dashboard        # datos agregados para los gráficos
POST   /payments/mercadopago        # crear preferencia de pago para saldar una deuda
GET    /groups/:id/export           # PDF/CSV del historial
```

Esto es un punto de partida, no un contrato cerrado — se ajusta a medida que se
implementa.

## 6. Roadmap por fases

| Fase | Contenido | Ventana sugerida |
|---|---|---|
| 1 | Backend base: Express + Prisma + PostgreSQL en Docker, modelo de datos, auth (registro/login) | Ahora → antes de Plantilla 02 (13/10) |
| 2 | CRUD de grupos, miembros, categorías y gastos; migrar `calculate()`/`distribute()` al backend | En paralelo con Plantilla 02 |
| 3 | Frontend consumiendo la API en vez de Context en memoria | Post Plantilla 02 |
| 4 | Dashboard con gráficos (gastos por categoría/período) | Antes de Plantilla 03 (04/12) |
| 5 | Integración Mercado Pago para saldar deudas | Post Plantilla 03 |
| 6 | Exportar/compartir divisiones (PDF o link) | Post Plantilla 03 |
| 7 | Tests + plan de pruebas formal + documentación final | Previo a entrega del informe final |

## 7. Requisitos académicos a no perder de vista

Esto no es solo "hacer que funcione" — hay entregables puntuales que la cátedra evalúa:

- [ ] **Diagrama de Casos de Uso + Fichas de Casos de Uso** (UML) para la Plantilla 02.
      No alcanza con la lista de endpoints de arriba en texto plano.
- [ ] **Diagrama de clases UML** para la Plantilla 03 (además del modelo de datos/ERD
      de Prisma — la cátedra espera notación UML específicamente).
- [ ] **Plan de pruebas derivado de los casos de uso** (Unidad 6), no solo tests
      automatizados de Jest — son artefactos de documentación distintos.
- [ ] Equipo de 2-3 personas (pendiente de definir compañeros).
- [ ] Informe final completo + defensa oral con coloquio.

## 8. Docker

`docker-compose.yml` en la raíz, dos servicios:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: cuantoes
      POSTGRES_PASSWORD: cuantoes
      POSTGRES_DB: cuantoes
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  api:
    build: ./server
    env_file: ./server/.env
    ports:
      - "3001:3001"
    depends_on:
      - db

volumes:
  db_data:
```

El frontend (`client/`) sigue con `npm start` nativo, no se containeriza.

## 9. Convenciones de trabajo

- Commits en español, en modo imperativo (`Agrega endpoint de login`, no `Agregado`).
- Variables de entorno en `server/.env` (nunca commitear; usar `.env.example`).
- Cada feature nueva del roadmap (sección 6) es idealmente una rama corta que mergea a
  `main` cuando el equipo la valida.

## 10. Por dónde arrancar con Claude Code

El primer paso concreto es la **Fase 1**: scaffolding de `server/` con Express, Prisma
apuntando a PostgreSQL vía Docker Compose, y el schema de la sección 4 traducido a
`schema.prisma`, más los endpoints de `auth` de la sección 5.
