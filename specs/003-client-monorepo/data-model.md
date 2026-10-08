# Data Model: Mudanza de la SPA a `client/`

**Feature**: `specs/003-client-monorepo/spec.md` | **Date**: 2026-10-08

## Datos

**Sin cambios.** No hay entidades nuevas, ni cambios en `server/prisma/schema.prisma`, ni
migraciones. El modelo vigente es el de la Fase 2
([specs/002-groups-expenses-settlements/data-model.md](../002-groups-expenses-settlements/data-model.md)).

## Estructura del repositorio

Lo que esta feature modifica son los "elementos" del repositorio de la sección Key Entities de la
spec. Cómo queda cada uno:

| Elemento | Antes | Después | Regla |
|---|---|---|---|
| Paquete del cliente | `src/`, `public/`, `package.json`, `package-lock.json` en la raíz | `client/src/`, `client/public/`, `client/package.json`, `client/package-lock.json` | Contenido idéntico; historial conservado (FR-001, FR-003, FR-007) |
| Dominio compartido | `src/classes/`, `src/utils/` | `client/src/classes/`, `client/src/utils/` | Una sola copia; el servidor lo importa por ruta relativa (FR-008) |
| Paquete del servidor | `server/` | `server/` | Solo cambian las rutas al dominio (FR-011) |
| Dependencias del cliente instaladas | `node_modules/` en la raíz | `client/node_modules/` | No versionadas; el servidor las necesita para `uuid` fuera de Docker (R2) |
| Build del cliente | `build/` en la raíz | `client/build/` | No versionado; Netlify lo publica (R4) |
| Configuración de publicación | Panel de Netlify | `netlify.toml` en la raíz (`base = "client"`) | Versionada (FR-012) |
| Imagen del servidor | `/repo/server`, `/repo/src/{classes,utils}`, enlace `/repo/node_modules` | `/repo/server`, `/repo/client/src/{classes,utils}`, enlace `/repo/client/node_modules` | Solo servidor + dominio (FR-010) |

## Dependencias entre paquetes

```text
client/src/classes, client/src/utils   (dominio: JS puro, ESM)
        ▲                       ▲
        │ import                │ require('../../../client/src/...')
        │                       │
client/src/components,      server/src/domain/settlements.js
client/src/context          server/tests/unit/settlements.domain.test.js

uuid  ← client/src/classes/Peer.js
        resuelto desde client/node_modules (host)
        o desde el enlace client/node_modules → server/node_modules (contenedor)
```

Invariante: ningún archivo de `client/` importa nada de `server/`. La dependencia va en un solo
sentido, del servidor hacia el dominio del cliente.
