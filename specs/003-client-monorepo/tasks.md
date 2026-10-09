---

description: "Lista de tareas para mudar la SPA a client/ (transición al monorepo, Fase 3)"
---

# Tasks: Mudanza de la SPA a `client/` (transición al monorepo)

**Input**: Documentos de diseño en `/specs/003-client-monorepo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: NO se escriben pruebas nuevas. La feature no cambia comportamiento: la verificación es
la suite existente del servidor (265 pruebas, FR-009), el build del cliente comparado archivo por
archivo contra una línea de base (R7) y los recorridos de `quickstart.md`.

**Organization**: tareas agrupadas por historia de usuario. La mudanza en sí (Phase 2) bloquea a
todas las historias; después, US1, US2 y US3 tocan archivos distintos y pueden avanzar en
paralelo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1…US3)
- Rutas relativas a la raíz del repositorio. Después de T004, la SPA vive en `client/`.

## Convenciones comunes (aplican a todas las tareas)

- **Commits**: los hace el usuario, nunca el agente. Las tareas marcadas con **⏸ commit** son
  puntos donde el agente se detiene, muestra `git status` y sugiere el mensaje. El commit de la
  mudanza (T005) DEBE contener solo renombres, sin cambios de contenido (R1).
- **Sin cambios funcionales**: ningún archivo de `client/` se edita en toda la feature
  (FR-007). Si una tarea parece requerirlo, detenerse y consultar.
- **Specs históricas**: nunca editar `specs/001-*` ni `specs/002-*` (FR-017), aunque mencionen
  `src/`.
- **Carpeta temporal**: la línea de base se guarda fuera del repo, en `$TMPDIR/cuantoes-003/`
  (en Windows con Git Bash, `$TMPDIR` apunta a la carpeta temporal del usuario). Usar siempre
  esa ruta.
- **Comandos**: Git Bash, desde la raíz del repo salvo indicación. La base de pruebas se levanta
  con `docker compose up -d db`.

---

## Phase 1: Setup (línea de base)

**Purpose**: registrar el estado anterior a la mudanza para poder demostrar que nada cambió
(SC-001, SC-002, R7). Se hace **antes** de mover cualquier archivo.

- [X] T001 Confirmar el punto de partida: rama `feature/003-client-monorepo`, `git status` sin
  cambios fuera de `specs/003-client-monorepo/`, y que existen en la raíz `src/`, `public/`,
  `package.json` y `package-lock.json` (37 archivos según `git ls-files src public package.json
  package-lock.json | wc -l`). Si el número difiere, actualizarlo en `plan.md` y en
  `quickstart.md` §2
  - *Estado 2026-10-08*: rama correcta, solo `specs/003-client-monorepo/` sin versionar, 37
    archivos ✅
- [X] T002 Generar la línea de base del cliente: `mkdir -p "$TMPDIR/cuantoes-003"`, `npm ci` en
  la raíz, `npm run build 2>&1 | tee "$TMPDIR/cuantoes-003/build-antes.log"` y
  `cp -r build "$TMPDIR/cuantoes-003/build-antes"`. Anotar las advertencias del build (si hay).
  Correr también `CI=true npm test -- --watchAll=false --passWithNoTests` en la raíz y guardar la
  salida en `$TMPDIR/cuantoes-003/client-tests-antes.txt`. Esperado:
  `No tests found, exiting with code 0`. Sin `--passWithNoTests` sale con código 1 (verificado el
  2026-10-08), porque el cliente no tiene pruebas
  - *Estado 2026-10-08*: `npm ci` y build OK; cliente: `No tests found, exiting with code 0` ✅.
    El build da **3 advertencias de ESLint ya existentes** (también en `main`), todas
    `no-unused-vars`: `AddCategoryBox.jsx:11` (`isMediumScreen`), `Navigation.jsx:15` (`result`)
    y `ResultContext.js:1` (`useEffect`). Son la línea de base: no se corrigen en esta feature
    (FR-007). En Git Bash, `$TMPDIR` es `/tmp`
- [X] T003 [P] Generar la línea de base del servidor: con `docker compose up -d db`, correr
  `npm test` en `server/` y guardar el resumen en `$TMPDIR/cuantoes-003/tests-antes.txt`.
  Esperado: `Tests: 265 passed, 265 total`. Si no pasan todos, detenerse: la mudanza no arranca
  sobre una base rota
  - *Estado 2026-10-08*: `Test Suites: 18 passed`, `Tests: 265 passed, 265 total` ✅

**Checkpoint**: línea de base guardada fuera del repo.

---

## Phase 2: Foundational (la mudanza)

**Purpose**: mover la SPA a `client/` conservando el historial. Bloquea a todas las historias.

**⚠️ CRITICAL**: este commit contiene únicamente renombres.

- [X] T004 Mover con git, sin editar nada: `mkdir client`, luego
  `git mv src client/src`, `git mv public client/public`, `git mv package.json client/package.json`
  y `git mv package-lock.json client/package-lock.json`. Verificar con
  `git status --short` que todas las entradas son `R` (renombre) y que
  `git diff --cached -M --stat` muestra 37 archivos con `0` líneas cambiadas
  - *Estado 2026-10-08*: `git mv src client/src` falló con `Permission denied` (Windows/OneDrive
    tenía tomada la carpeta), así que se movió archivo por archivo
    (`git mv "$f" "client/$f"` sobre `git ls-files`) y después se borraron las carpetas vacías.
    Resultado: 37 `R`, `37 files changed, 0 insertions(+), 0 deletions(-)` ✅
- [X] T005 **⏸ commit** Mostrar `git status` al usuario y sugerir el mensaje
  `Mueve la SPA a client/ (sin cambios de contenido)`. No seguir hasta que el usuario confirme
  el commit. Después, comprobar con
  `git log --follow --oneline -- client/src/utils/calculate.js | tail -3` que aparecen commits
  anteriores a la mudanza (FR-003). Anotar el hash del commit de la mudanza en la nota de estado
  de esta tarea (lo usa T025)
  - *Estado 2026-10-08*: commit de la mudanza **`e4eceac3`** ("Implement de la Fase 3. Mover el
    front a client/"). Contiene los 37 renombres como `R100` (sin ediciones) y además los 7
    documentos nuevos de `specs/003-client-monorepo/`, que no afectan la detección de renombres.
    `git log --follow` muestra historial anterior: `calculate.js` 9 commits, `index.html` 13 y
    `package.json` 11 ✅

**Checkpoint**: la SPA está en `client/` con su historial. A partir de acá el servidor no
encuentra el dominio hasta T012 y el sitio de Netlify no se construye hasta T008: no integrar
la rama en este estado.

---

## Phase 3: User Story 1 - La app sigue funcionando igual (Priority: P1) 🎯 MVP

**Goal**: la SPA se instala, se levanta y se construye desde `client/` exactamente igual que
antes, y el sitio publicado se construye desde la nueva ubicación.

**Independent Test**: `quickstart.md` §1–§3: limpiar restos, `npm ci` en `client/`, build
comparado idéntico con la línea de base y recorrido manual sin diferencias.

### Implementation for User Story 1

- [X] T006 [US1] Limpiar los restos locales de la raíz que ya no corresponden:
  `rm -rf node_modules build` (no están versionados). Instalar el cliente con `npm ci` en
  `client/`
  - *Estado 2026-10-08*: restos de la raíz borrados; `npm ci` en `client/` OK ✅
- [X] T007 [P] [US1] Actualizar `.gitignore` (R6): reemplazar `/*node_modules` (línea 4) por
  `/client/node_modules/`, `/coverage` (línea 9) por `/client/coverage/` y `/build` (línea 12)
  por `/client/build/`. Dejar intactas las reglas `.env.*.local`, los logs y las de `server/`.
  Verificar con `git status --short` que no aparecen `client/node_modules/` ni `client/build/`
  después del build de T009
  - *Estado 2026-10-08*: `git status` no lista `client/node_modules/` ni `client/build/` ✅
- [X] T008 [P] [US1] Crear `netlify.toml` en la raíz (R4) con un comentario de una línea que
  explique que el sitio se construye desde `client/`, y la sección:
  `[build]` con `base = "client"`, `command = "npm run build"` (el mismo comando del panel; R4) y `publish = "build"` (relativo a
  `base`). Sin `[[redirects]]` ni otras secciones: la navegación directa no cambia en esta
  feature (R5)
- [X] T009 [US1] Build comparado (SC-002, R7): en `client/`,
  `npm run build 2>&1 | tee "$TMPDIR/cuantoes-003/build-despues.log"`; luego
  `diff "$TMPDIR/cuantoes-003/build-antes.log" "$TMPDIR/cuantoes-003/build-despues.log"` (sin
  advertencias nuevas; pueden variar solo tiempos o rutas impresas) y
  `diff -r "$TMPDIR/cuantoes-003/build-antes" build`. Esperado: sin diferencias. Si difieren
  archivos que no son `.map`, detenerse e investigar; si solo difieren `.map`, documentar por qué
  en la nota de estado de esta tarea
  - *Estado 2026-10-08*: build OK; `diff` de los logs sin diferencias (mismas 3 advertencias);
    `diff -r` de los dos `build/` **sin diferencias** (bundle `main.9fec9b0f.js`, el mismo que
    publica `cuanto-es.netlify.app`). Pruebas del cliente: misma salida, código 0 ✅
- [X] T010 [US1] Recorrido manual (SC-003): `npm start` en `client/` y seguir los 5 pasos de
  `quickstart.md` §3 "Recorrido manual", también en un ancho de 320 px. Comparar con la misma
  carga en `https://cuanto-es.netlify.app/`, que sirve exactamente el build de la línea de base
  (mismo hash, R4). Si el agente no puede abrir un navegador, pedirle al
  usuario que haga el recorrido y registrar su resultado
  - *Estado 2026-10-08*: recorrido hecho por el usuario con `npm start` en `client/`
    (puerto 3000): los flujos funcionan bien ✅
- [X] T011 [US1] **⏸ commit** Sugerir `Ignora artefactos de client/ y versiona la configuración de Netlify`
  para `.gitignore` y `netlify.toml`
  - *Estado 2026-10-08*: commit `75587798` ✅

**Checkpoint**: el cliente funciona desde `client/` y el sitio tiene configuración versionada.

---

## Phase 4: User Story 2 - El servidor sigue calculando con el dominio del cliente (Priority: P1)

**Goal**: el servidor importa el dominio desde `client/src/` en el host y en el contenedor, con
las 265 pruebas en verde y el escenario de la Fase 2 funcionando en Docker.

**Independent Test**: `quickstart.md` §4–§5: `npm test` en `server/` con 265 pruebas en verde,
imagen construida desde cero y los 15 pasos de la quickstart de la Fase 2 contra la API del
contenedor.

### Implementation for User Story 2

- [X] T012 [P] [US2] En `server/src/domain/settlements.js` (líneas 11–12), cambiar
  `'../../../src/classes/Category.js'` por `'../../../client/src/classes/Category.js'` y
  `'../../../src/utils/calculate.js'` por `'../../../client/src/utils/calculate.js'`. Si el
  comentario de cabecera del archivo menciona `src/`, actualizarlo a `client/src/`. No cambiar
  nada más (FR-011)
- [X] T013 [P] [US2] Mismo cambio en `server/tests/unit/settlements.domain.test.js` (líneas 5–6)
- [X] T014 [US2] Correr `npm test` en `server/` (con `docker compose up -d db` y `client/`
  instalado por T006). Esperado: la misma cantidad que `$TMPDIR/cuantoes-003/tests-antes.txt`
  (265 passed). Comprobar además que el dominio no está duplicado:
  `git ls-files | grep -E '(^|/)calculate\.js$'` devuelve solo `client/src/utils/calculate.js`
  - *Estado 2026-10-08*: `Tests: 265 passed, 265 total` (igual que la línea de base); el único
    `calculate.js` versionado es `client/src/utils/calculate.js` ✅
- [X] T015 [P] [US2] Actualizar `server/Dockerfile` (R3): comentario de las líneas 1–2 (el
  dominio está en `client/src/classes` y `client/src/utils`); `COPY client/src/classes
  /repo/client/src/classes` y `COPY client/src/utils /repo/client/src/utils` en lugar de las
  líneas 12–13; y en las líneas 15–17, comentario (`client/src/classes/Peer.js` importa `uuid`;
  Node lo busca subiendo desde `/repo/client/src`) y
  `RUN ln -s /repo/server/node_modules /repo/client/node_modules`
- [X] T016 [P] [US2] Actualizar `.dockerignore` (R3): en el comentario de las líneas 1–2, "el
  dominio compartido del cliente (`client/src/classes`, `client/src/utils`)"; reemplazar
  `!src/classes/` y `!src/utils/` por `!client/src/classes/` y `!client/src/utils/`. No agregar
  ninguna otra excepción (la imagen no lleva el resto de `client/`)
- [X] T017 [P] [US2] Actualizar el comentario del servicio `api` en `docker-compose.yml` (línea
  22): "la imagen incluye `client/src/classes` y `client/src/utils`". Nada más cambia en el
  compose
- [X] T018 [US2] Validar en Docker (FR-010, SC-004) según `quickstart.md` §5:
  `docker compose down`, `docker compose build --no-cache api`, `docker compose up -d`; en los
  logs de `api` deben verse las migraciones aplicadas y la API escuchando en 3001;
  `docker compose exec api ls /repo/client/src` debe listar solo `classes` y `utils`. Recorrer los
  15 pasos de `specs/002-groups-expenses-settlements/quickstart.md` §2 contra
  `http://localhost:3001` y confirmar que las liquidaciones se calculan
  - *Estado 2026-10-08*: `docker compose build --no-cache api` OK; logs: "2 migrations found",
    "No pending migrations to apply", "API de CuantoEs escuchando en el puerto 3001".
    `/repo` tiene solo `client` y `server`; `/repo/client/src` solo `classes` y `utils`;
    `/repo/client/node_modules` → `/repo/server/node_modules`. Los 15 pasos de la quickstart de
    la Fase 2, con un script contra `http://localhost:3001`: **15 OK** (paso 12: Dani→Ana 40.00 y
    Dani→Beto 10.00, coincide con la cuenta a mano) ✅. En Git Bash, `docker compose exec` con
    rutas necesita `MSYS_NO_PATHCONV=1`
- [X] T019 [US2] **⏸ commit** Sugerir `Apunta el servidor y la imagen Docker al dominio en client/`
  para los cinco archivos de T012–T017
  - *Estado 2026-10-08*: commit `9e6eb86f` ✅

**Checkpoint**: backend completo sobre la nueva estructura.

---

## Phase 5: User Story 3 - Un integrante nuevo se orienta con la documentación (Priority: P2)

**Goal**: la documentación describe la estructura `client/` + `server/` sin referencias
vigentes a la SPA en la raíz.

**Independent Test**: seguir solo el README desde un clon limpio (`quickstart.md` §1–§4) y la
búsqueda de referencias residuales de `quickstart.md` §6 sin resultados.

### Implementation for User Story 3

- [X] T020 [P] [US3] Actualizar `README.md` (FR-015):
  - Sección "Cómo usar" (castellano, líneas 18–22) y "How to Use" (inglés, líneas 109–113):
    agregar el paso `cd client` antes de `npm install` / `npm start`.
  - Línea 32: `` `client/src/utils/calculate.js` ``.
  - Bloque de "Tests" (línea 75): `npm install` se corre en `client/` ("el cálculo usa
    `client/src/utils/calculate.js`, que importa `uuid`"), con `cd client` / `cd ../server`
    según corresponda. Agregar debajo que, si los tests fallan con `Cannot find module 'uuid'`
    desde `client/src/classes/Peer.js`, faltan las dependencias del cliente
    (`cd client && npm install`).
  - Agregar, al final de la sección del backend, una nota breve "Si venís de una versión
    anterior" con dos puntos: (1) borrar `node_modules/` y `build/` de la raíz e instalar en
    `client/`; (2) si tenés una rama con cambios en `src/`, al hacer merge o rebase git
    normalmente los aplica sobre `client/src/`; si aparece un conflicto de tipo "deleted by
    them", aplicar el cambio a mano en el archivo equivalente de `client/src/`.
  - No cambiar el resto del texto (datos del desarrollador, enlaces).
- [X] T021 [P] [US3] Actualizar `docs/CLAUDE.md` §2 "Estado actual" (líneas 16–27) (FR-016,
  FR-018): `client/` es la app React y su dominio está en `client/src/classes/` y
  `client/src/utils/calculate.js`; reemplazar "`server/` — no existe todavía" por una línea que
  diga que `server/` tiene la API de las Fases 1 y 2; agregar que la transición al monorepo de la
  constitución quedó completa con `specs/003-client-monorepo`. La descripción de los Context
  ("esto es lo que hay que reemplazar") se mantiene. §3 ya muestra `client/`: no cambia
- [X] T022 [P] [US3] En `docs/entregables/diagrama-de-clases.md` línea 70, renombrar el paquete
  PlantUML a `"Dominio del cliente (client/src/, reutilizado)"` y actualizar cualquier otra
  mención a `src/classes` o `src/utils` del mismo archivo (buscar con
  `grep -n "src/" docs/entregables/diagrama-de-clases.md`). Revisar con el mismo `grep`
  `docs/entregables/casos-de-uso.md` y `docs/entregables/plan-de-pruebas.md`, y corregir solo
  rutas del dominio del cliente (las de `server/` quedan)
  - *Estado 2026-10-08*: solo `diagrama-de-clases.md:70` mencionaba `src/`; los otros dos
    entregables no tienen rutas del dominio del cliente ✅
- [X] T023 [US3] **⏸ commit** Sugerir `Actualiza la documentación a la estructura client/ + server/`
  - *Estado 2026-10-08*: commit `38f5890a` ✅

**Checkpoint**: las tres historias completas.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 Buscar referencias residuales (SC-006) con los comandos de `quickstart.md` §6 (son dos
  búsquedas; las dos deben dar vacío). Corregir lo que aparezca (fuera de `specs/001-*`, `specs/002-*` y
  `client/`) y repetir
  - *Estado 2026-10-08*: las dos búsquedas, sobre el árbol de trabajo (incluido lo no
    commiteado), sin resultados ✅
- [X] T025 Verificar la estructura (FR-001, FR-002, SC-007) según `quickstart.md` §2: en la raíz
  no hay `src/`, `public/`, `package.json` ni `package-lock.json`; `git ls-files client | wc -l`
  da 37; `git log --follow` muestra historial anterior en `client/src/utils/calculate.js`,
  `client/public/index.html` y `client/package.json`. Confirmar que ningún archivo de `client/`
  cambió después del commit de la mudanza: `git diff <hash anotado en T005> -- client/` vacío
  - *Estado 2026-10-08*: raíz con `client/`, `docker-compose.yml`, `docs/`, `netlify.toml`,
    `README.md`, `server/` y `specs/`; 37 archivos en `client/`; `git diff e4eceac3 -- client/`
    vacío; historial verificado en T005 ✅
- [X] T026 Prueba de un integrante nuevo (SC-008, US3): en una carpeta temporal fuera del repo,
  `git clone` del repositorio local y `git checkout feature/003-client-monorepo`; seguir **solo**
  el README para instalar y levantar el cliente y correr las pruebas del servidor (con la base de
  `quickstart.md` §4). Medir el tiempo sin contar la descarga de dependencias. Esperado: menos
  de 15 minutos y ningún paso que falle. Lo ideal es que lo haga un integrante que no participó;
  si no hay quién, lo hace el agente y lo anota en la nota de estado. Al terminar, borrar la
  carpeta temporal
  - *Estado 2026-10-08*: lo hizo el agente en un clon de `38f5890a` dentro del scratchpad. Se
    copió `server/.env` local en lugar de partir de `.env.example`, porque la base del compose ya
    estaba inicializada con esas credenciales. Cliente: `npm install` y build OK. Servidor:
    **13 suites fallaron** con "@prisma/client did not initialize yet": `npm install` (npm
    11.18) no generó el cliente de Prisma y el README no lo indicaba. Es un hueco anterior a
    esta feature (README de la Fase 1). Con `npx prisma generate`: **265 passed**. Se agregó ese
    paso al bloque de Tests del README. Tiempo total ≈ 4 min sin contar el diagnóstico (< 15 min)
    ✅. Clon borrado
- [X] T027 Verificación previa al merge (constitución, Flujo de trabajo: `npm test` en los
  paquetes afectados): `npm test` en `server/` (265 en verde);
  `CI=true npm test -- --watchAll=false --passWithNoTests` en `client/` (código 0, misma salida
  que `$TMPDIR/cuantoes-003/client-tests-antes.txt`); `npm run build` en `client/` sin
  advertencias nuevas; y `git status` sin `server/.env`, `node_modules` ni `build`. Registrar el
  resultado como nota de estado de esta tarea (fecha y números)
  - *Estado 2026-10-08*: servidor `Tests: 265 passed, 265 total`; cliente código 0, misma salida
    que la línea de base; build de `client/` con un log idéntico al de la línea de base (mismas 3
    advertencias); `git status` sin `server/.env`, `node_modules` ni `build`. Queda solo el ajuste
    del README de T026 sin commitear ✅
- [X] T028 Dejar anotado en esta tarea, como pendientes para después del merge a `main` (no se
  ejecutan en la rama):
  1. Validar el sitio publicado según `quickstart.md` §7 (SC-005): despliegue con base `client`,
     app y recursos sin 404 nuevos, `/sitemap.xml` 200, `/` 200 y `/persons` 404 como antes.
  2. Enmienda PATCH de la constitución con `/speckit-constitution` para quitar la cláusula
     "Transición al monorepo", ya cumplida (R8).
  3. En la feature siguiente de la Fase 3, agregar la regla `/* → /index.html 200` en
     `netlify.toml` para la navegación directa (R5).
  4. Decidir si el enlace "en línea" del README (castellano e inglés) pasa de
     `distributionm.netlify.app`, un sitio viejo que ya no recibe deploys, a
     `cuanto-es.netlify.app` (R4). No se cambió en esta feature porque T020 deja los enlaces como
     están.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. DEBE completarse antes de mover nada.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **US1, US2, US3 (Phases 3–5)**: dependen de Foundational. Tocan archivos distintos y pueden
  avanzar en paralelo.
- **Polish (Phase 6)**: depende de las tres historias.

### User Story Dependencies

- **US1 (P1)**: solo de Foundational.
- **US2 (P1)**: de Foundational y de T006 (`client/node_modules` instalado, para `uuid` en
  T014). El resto de US2 no depende de US1.
- **US3 (P2)**: solo de Foundational. Conviene revisarla al final de US1 y US2 para que la
  documentación refleje exactamente lo hecho.

### Within Each User Story

- US1: T006 → (T007 ∥ T008) → T009 → T010 → T011.
- US2: (T012 ∥ T013) → T014; (T015 ∥ T016 ∥ T017) → T018; T014 y T018 → T019.
- US3: (T020 ∥ T021 ∥ T022) → T023.

### Parallel Opportunities

- T003 en paralelo con T002 (servidor y cliente no comparten archivos).
- Después de T005: T007, T008, T012, T013, T015, T016, T017, T020, T021 y T022 tocan archivos
  distintos y pueden hacerse a la vez.

---

## Parallel Example: después de la mudanza

```bash
# Ediciones independientes (archivos distintos):
Task: "T007 [US1] .gitignore con reglas de client/"
Task: "T008 [US1] netlify.toml con base = client"
Task: "T012 [US2] ruta al dominio en server/src/domain/settlements.js"
Task: "T013 [US2] ruta al dominio en server/tests/unit/settlements.domain.test.js"
Task: "T015 [US2] server/Dockerfile"
Task: "T016 [US2] .dockerignore"
Task: "T017 [US2] comentario de docker-compose.yml"

# Verificaciones que dependen de lo anterior:
Task: "T009 [US1] build comparado"
Task: "T014 [US2] npm test en server/"
Task: "T018 [US2] validación en Docker"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

Las dos historias P1 son inseparables en la práctica: después de la mudanza, el servidor deja
de encontrar el dominio hasta T012. La rama no se integra con solo US1.

1. Phase 1: línea de base.
2. Phase 2: mudanza y commit de renombres.
3. US1 y US2 (en paralelo).
4. **STOP and VALIDATE**: build idéntico, 265 pruebas en verde y Docker funcionando.
5. US3 y Polish.

### Incremental Delivery

1. Setup + Foundational → la SPA está en `client/` con historial (no integrable todavía).
2. US1 → el cliente funciona y Netlify está configurado.
3. US2 → el servidor y Docker funcionan: la rama ya es funcional de punta a punta.
4. US3 → documentación al día.
5. Polish → prueba de un integrante nuevo y verificación previa al merge; validación del sitio
   después del merge.

---

## Notes

- Orden de integración: `feature/001` → `feature/002` → `feature/003` (la rama sale de la Fase 2
  sin integrar).
- Ramas con cambios en `src/`: ver la nota "Si venís de una versión anterior" del README (T020).
- Las tareas de verificación (T009, T010, T014, T018, T024–T027) se marcan con una nota de
  estado con fecha y resultado, como en la Fase 2.
