# Implementation Plan: Mudanza de la SPA a `client/` (transición al monorepo)

**Branch**: `feature/003-client-monorepo` (sobre la Fase 2) | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-client-monorepo/spec.md`

## Summary

Primera feature de la Fase 3. Mueve la SPA React de la raíz a `client/` para dejar el repositorio
con `client/` y `server/` como paquetes hermanos, que es la condición de la constitución para
cerrar la Fase 3. No cambia el comportamiento de la app ni del servidor.

Enfoque (ver [research.md](research.md)):

- `git mv` de `src/`, `public/`, `package.json` y `package-lock.json` a `client/`, en un commit
  que solo contiene los renombres, para que el historial siga a los archivos (R1).
- El servidor cambia únicamente la ruta relativa al dominio (`../../../client/src/...`) en el
  adaptador y en su prueba unitaria (R2). Docker replica el nuevo layout y enlaza
  `client/node_modules` al del servidor para `uuid` (R3).
- `netlify.toml` versionado con `base = "client"`, para que el sitio se construya desde la nueva
  ubicación sin tocar el panel (R4). Sin redirecciones nuevas: la navegación directa sigue igual
  que hoy (R5).
- `.gitignore` con reglas para `client/` (R6), y la documentación al día (R8).
- Evidencia de "sin cambios": build de producción antes y después, comparado archivo por archivo
  (R7), más los 265 tests del servidor y el recorrido de la Fase 2 en contenedores.

## Technical Context

**Language/Version**: JavaScript. Cliente: React 18 con Create React App 5 (`react-scripts`
5.0.1). Servidor: Node.js 24 (CommonJS) con `require()` de los módulos ESM del dominio.

**Primary Dependencies**: sin cambios. Cliente: las de `package.json` actual (se mueve tal cual,
con su lockfile). Servidor: Express 5, Prisma 6, Jest 30.

**Storage**: N/A (sin cambios de esquema ni migraciones).

**Testing**: Jest en `server/` (265 pruebas, Fase 1 + Fase 2). El cliente no tiene pruebas; su
verificación es el build comparado (R7) y el recorrido manual de la quickstart.

**Target Platform**: SPA estática en Netlify (cliente); contenedor Docker `node:24-alpine`
(servidor); desarrollo en Windows, macOS o Linux.

**Project Type**: aplicación web en monorepo (`client/` + `server/`).

**Performance Goals**: N/A. El tiempo de build y el de las pruebas no deben cambiar de forma
apreciable.

**Constraints**: cero cambios funcionales (FR-004, FR-011); dependencias con las mismas
versiones (FR-006); historial conservado (FR-003); no reescribir specs anteriores (FR-017).

**Scale/Scope**: 4 rutas movidas (37 archivos versionados), 2 archivos del servidor con una
ruta cada uno, 3 archivos de configuración de contenedores, `.gitignore`, `netlify.toml` nuevo y
3 documentos editados y 2 revisados (los otros entregables).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Exactitud del Cálculo | `calculate.js` y `Category.distribute()` no se tocan; solo cambian de carpeta. El servidor los sigue reutilizando sin copiarlos (R2). Los 265 tests, incluidos los escenarios de referencia de SC-001 de la Fase 2, deben pasar. | ✅ |
| II. Dominio reutilizable / fuente de verdad en el servidor | El dominio sigue siendo JS puro compartido. La migración de los Context a la API no es parte de esta feature (es la siguiente de la Fase 3). | ✅ |
| III. Pruebas de la lógica de reparto | No hay cambios en el dominio, así que no hacen falta pruebas nuevas. La suite existente es la verificación (FR-009). | ✅ |
| IV. Experiencia responsive y clara | Sin cambios de UI. El build comparado (R7) garantiza que la app servida es la misma. | ✅ |
| V. Arquitectura cliente-servidor con stack fijo | Es justamente la feature que deja el monorepo `client/` + `server/` exigido. Sin dependencias nuevas. `netlify.toml` es configuración de la plataforma ya fijada, no una dependencia. Sin workspaces ni capas nuevas (YAGNI). | ✅ |
| VI. Seguridad y privacidad | Sin cambios. `server/.env` sigue ignorado y `.dockerignore` sigue dejándolo afuera de la imagen. | ✅ |
| VII. Persistencia e historial | Sin cambios de esquema. | ✅ |
| Restricciones técnicas: transición al monorepo | Feature propia, sin trabajo funcional de backend ni de cliente, antes de cerrar la Fase 3. | ✅ |
| Restricciones técnicas: build y lint | `npm run build` en `client/` sin errores ni advertencias nuevas (SC-002, R7). | ✅ |
| Entregables académicos | Se actualiza la ubicación del dominio en el diagrama de clases. No hay casos de uso nuevos: es un cambio de estructura sin funcionalidad visible para el usuario. | ✅ |

**Re-check post-diseño**: sin cambios. El diseño no agrega dependencias, capas ni configuración
por entorno, y deja la constitución lista para quitar la cláusula de transición en una enmienda
PATCH posterior (R8).

## Project Structure

### Documentation (this feature)

```text
specs/003-client-monorepo/
├── plan.md              # Este archivo
├── research.md          # Phase 0: decisiones R1–R8
├── data-model.md        # Phase 1: sin cambios de datos; mapa de la estructura antes/después
├── quickstart.md        # Phase 1: guía de validación
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

No hay `contracts/`: la feature no cambia ninguna interfaz externa. La API HTTP es la misma
(`specs/002-groups-expenses-settlements/contracts/groups-api.yaml`) y la SPA no expone una
interfaz programática.

### Source Code (repository root)

Estado final (✱ = cambia en esta feature):

```text
cuanto-es/
├── client/                        ✱ NUEVO: la SPA, movida con git mv sin cambios de contenido
│   ├── package.json               ✱ (desde la raíz)
│   ├── package-lock.json          ✱ (desde la raíz)
│   ├── public/                    ✱ (desde la raíz)
│   └── src/                       ✱ (desde la raíz)
│       ├── classes/               #   dominio compartido: Category, Person, Peer
│       ├── utils/                 #   dominio compartido: calculate, idGenerator
│       ├── components/
│       ├── context/
│       ├── App.jsx
│       └── index.js
├── server/
│   ├── Dockerfile                 ✱ COPY y enlace con el layout de client/ (R3)
│   ├── src/domain/settlements.js  ✱ ruta al dominio: ../../../client/src/... (R2)
│   └── tests/unit/
│       └── settlements.domain.test.js  ✱ misma ruta (R2)
├── docs/
│   ├── CLAUDE.md                  ✱ §2 Estado actual (R8)
│   └── entregables/
│       └── diagrama-de-clases.md  ✱ paquete del dominio en client/src/ (R8)
├── specs/                         #   001 y 002 sin cambios (FR-017)
├── .dockerignore                  ✱ !client/src/classes/, !client/src/utils/ (R3)
├── .gitignore                     ✱ reglas de client/ (R6)
├── docker-compose.yml             ✱ solo el comentario del servicio api (R3)
├── netlify.toml                   ✱ NUEVO: base = "client" (R4)
└── README.md                      ✱ instalación desde client/ y pruebas del servidor (R8)
```

**Structure Decision**: queda la arquitectura objetivo de `docs/CLAUDE.md` §3: dos paquetes
independientes, cada uno con su `package.json` y su lockfile, sin manifiesto en la raíz. El
dominio compartido vive solo en `client/src/{classes,utils}` y el servidor lo importa por ruta
relativa, igual que hasta ahora.

### Referencias a actualizar

Inventario completo de referencias vigentes a la ubicación anterior (búsqueda del 2026-10-08,
excluidas `node_modules/` y las specs históricas):

| Archivo | Línea(s) | Qué cambia |
|---|---|---|
| `server/src/domain/settlements.js` | 11–12 | `require` de `Category` y `calculate` |
| `server/tests/unit/settlements.domain.test.js` | 5–6 | ídem |
| `server/Dockerfile` | 1–2, 12–13, 15–17 | comentario, `COPY`, enlace de `node_modules` |
| `.dockerignore` | 1–2, 8–9 | comentario y excepciones |
| `docker-compose.yml` | 22 | comentario del servicio `api` |
| `README.md` | 20–21, 32, 75, 111–112 | instalación, mención del algoritmo, pruebas del servidor |
| `docs/CLAUDE.md` | 18–27 | estado actual |
| `docs/entregables/diagrama-de-clases.md` | 70 | nombre del paquete |
| `.gitignore` | 4, 9, 12 | reglas de dependencias, coverage y build |

### Orden de trabajo

El orden importa para conservar el historial y para tener una línea de base:

1. **Línea de base**: build de producción en la raíz guardado fuera del repo, con su salida de
   consola (R7). Confirmar los 265 tests del servidor en verde.
2. **Mudanza**: `git mv` de las cuatro rutas, sin tocar contenido. Commit propio (lo hace el
   usuario).
3. **Servidor**: rutas del adaptador y de la prueba; tests en verde con `client/` instalado.
4. **Docker**: `Dockerfile`, `.dockerignore` y comentario del compose; build desde cero y
   recorrido de la Fase 2.
5. **Publicación e ignorados**: `netlify.toml` y `.gitignore`.
6. **Documentación**: README, `docs/CLAUDE.md`, diagrama de clases.
7. **Verificación final**: build comparado, recorrido manual de la SPA, búsqueda de referencias
   residuales y `git log --follow` sobre archivos movidos (quickstart).
8. **Después del merge a `main`**: validar el sitio publicado (SC-005).

## Complexity Tracking

Sin violaciones de la constitución que justificar.
