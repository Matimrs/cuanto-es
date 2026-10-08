# Research: Mudanza de la SPA a `client/`

**Feature**: `specs/003-client-monorepo/spec.md` | **Date**: 2026-10-08

No quedaron `NEEDS CLARIFICATION` en el Technical Context. Cada sección resuelve una decisión de
diseño, con el inventario del estado actual verificado en el repositorio.

## R1. Qué se mueve y cómo

- **Decision**: mover con `git mv` a `client/` exactamente estos archivos versionados de la raíz:
  `src/`, `public/`, `package.json` y `package-lock.json`. La mudanza va en un commit propio que
  **solo** contiene esos renombres, sin modificar ningún contenido; los ajustes de rutas, la
  configuración y la documentación van en commits posteriores.
- **Rationale**: git no guarda los renombres, los detecta comparando contenido. Si el commit de
  la mudanza tiene archivos idénticos, la detección es del 100 % y `git log --follow` muestra la
  historia completa (FR-003, SC-007). Mezclar ediciones en el mismo commit no la rompe para
  cambios chicos, pero hace más difícil revisar que el código de la SPA no cambió (FR-007).
- **Inventario**: en la raíz no hay otra configuración propia de la SPA. ESLint y `browserslist`
  viven dentro de `package.json`, y no existen `.env*`, `jsconfig.json`, `.eslintrc`,
  `.babelrc` ni `netlify.toml`. `build/` y `node_modules/` no están versionados.
- **Alternatives considered**: copiar y borrar (pierde la detección cuando hay cambios); un
  `git filter-repo` para reescribir el historial como si siempre hubiera estado en `client/`
  (reescribe commits ya publicados en `main`, inaceptable).

## R2. Cómo encuentra el servidor el dominio del cliente

- **Estado actual**: `server/src/domain/settlements.js` y
  `server/tests/unit/settlements.domain.test.js` hacen
  `require('../../../src/classes/Category.js').default` y
  `require('../../../src/utils/calculate.js')`. Los archivos del dominio son ESM sin
  `"type": "module"`; Node (24+) los detecta por su sintaxis y `require()` los carga como ESM.
  `Peer.js` importa `uuid`, que Node resuelve subiendo desde el archivo hasta un `node_modules`
  (hoy, el de la raíz).
- **Decision**: cambiar solo la ruta relativa a `../../../client/src/classes/Category.js` y
  `../../../client/src/utils/calculate.js` en esos dos archivos (y el comentario que la nombra).
- **Rationale**: es lo que ya anticipaba el plan de la Fase 2 ("solo cambia la ruta relativa del
  adaptador y la copia del Dockerfile"). La detección de ESM no cambia, porque
  `client/package.json` es el mismo archivo sin `"type"`. `uuid` se resuelve desde
  `client/node_modules`, que es donde ya está instalado para la SPA. Babel/Jest tampoco cambian:
  no hay configuración de Babel en ninguno de los dos `package.json`.
- **Consecuencia documentada**: fuera de Docker, las pruebas del servidor exigen
  `npm install` en `client/` (hoy lo exigen en la raíz). Va al README y a la quickstart.
- **Alternatives considered**:
  - Un alias o `NODE_PATH` hacia `client/src`: agrega configuración por entorno sin necesidad
    (YAGNI, Principio V).
  - Un paquete compartido (`packages/domain/`) o workspaces de npm: cambia la arquitectura de
    dos paquetes fijada por la constitución y mueve el dominio fuera de la SPA, que no es lo que
    pide esta feature.
  - Copiar el dominio a `server/`: duplica el algoritmo (viola el Principio I y FR-008).

## R3. Docker

- **Decision**: mantener el contexto de build en la raíz y replicar el nuevo layout dentro de la
  imagen:
  - `COPY client/src/classes /repo/client/src/classes` y
    `COPY client/src/utils /repo/client/src/utils`.
  - El enlace para `uuid` pasa a `ln -s /repo/server/node_modules /repo/client/node_modules`.
  - `.dockerignore`: `!client/src/classes/` y `!client/src/utils/` en lugar de las rutas de
    `src/`. Se actualizan los comentarios de `server/Dockerfile`, `.dockerignore` y
    `docker-compose.yml`.
- **Rationale**: mismo criterio que R10 de la Fase 2: la ruta relativa
  `../../../client/src/...` vale igual en el host y en el contenedor. El enlace queda en
  `client/node_modules` porque Node busca `uuid` subiendo desde `/repo/client/src/classes`, y el
  primer `node_modules` que encuentra es ese. La imagen sigue llevando solo el servidor y las dos
  carpetas del dominio (edge case "Contenedor").
- **Alternatives considered**: enlazar en `/repo/node_modules` como hoy (también funciona,
  porque Node sigue subiendo hasta `/repo`, pero deja un enlace en un lugar que ya no
  corresponde al layout del repo y es menos claro).

## R4. Publicación en Netlify

- **Estado actual**: no hay `netlify.toml`; la configuración de build está en el panel de
  Netlify, que no es visible desde el repo. El sitio de este repositorio es
  `https://distributionm.netlify.app/` (enlace del README).
- **Hallazgos durante la implementación** (2026-10-08):
  - `cuantoes.com.ar` sirve otra aplicación (Next.js, título "¿Cuánto es? — Dividí la cuenta
    fácil"), no esta SPA. Las validaciones del sitio publicado usan solo
    `distributionm.netlify.app`.
  - `distributionm.netlify.app` sirve una versión anterior a mayo de 2025: `/sitemap.xml`
    (agregado en `8d50b24e`, 2025-05-23) responde 404 y el bundle no coincide con el build de
    `main`. Es probable que el sitio ya no despliegue automáticamente desde el repo; hay que
    confirmarlo en el panel.
  - El build tiene 3 advertencias de ESLint que también están en `main`. Create React App las
    trata como errores si `CI=true`, que es como suelen correr los builds de Netlify. Como el
    sitio se publicó igual, el comando del panel probablemente anula `CI`, o el entorno no lo
    define.
- **Decision**: agregar `netlify.toml` en la raíz con:

  ```toml
  [build]
    base = "client"
    command = "CI= npm run build"
    publish = "build"
  ```

  `publish` es relativo a `base`, así que publica `client/build/`. `CI=` vacía la variable solo
  para el build: da el mismo resultado que hoy tanto si el panel ya la anulaba como si el
  entorno no la define, y evita que las 3 advertencias existentes rompan el despliegue. Corregir
  esas advertencias es un cambio de código del cliente, fuera de esta feature (FR-007).
- **Rationale**: la configuración del archivo tiene prioridad sobre la del panel, así que el
  primer despliegue después del merge construye desde `client/` sin que nadie toque el panel
  (FR-012). Queda versionada y revisable. No se agregan redirecciones (R5).
- **Riesgo**: si en el panel hay variables de entorno o un comando distinto, el archivo los pisa
  solo en lo que define (base, command, publish); las variables de entorno del panel se siguen
  aplicando. Se pide revisar el panel al integrar (Assumptions de la spec).
- **Alternatives considered**: cambiar el directorio base en el panel (manual, no versionado y
  hay que coordinarlo con el momento exacto del merge).

## R5. Navegación directa a rutas internas

- **Hallazgo** (verificado el 2026-10-08): `GET /` responde 200 y `GET /persons` responde 404,
  en `distributionm.netlify.app` (el sitio de este repo; ver R4). La SPA usa `BrowserRouter` y no
  existe una regla `/* → /index.html 200`.
- **Decision**: no agregar la regla en esta feature. Se corrigió la spec (US1-4, FR-013) para
  que exija mantener el comportamiento actual y no uno que hoy no existe.
- **Rationale**: agregarla cambia el comportamiento del sitio (FR-004) y la constitución pide que
  esta feature no se mezcle con trabajo funcional. Es una línea en `netlify.toml`, así que se
  recomienda sumarla en la feature siguiente de la Fase 3.

## R6. Archivos ignorados

- **Estado actual**: `.gitignore` tiene reglas de CRA ancladas a la raíz (`/*node_modules`,
  `/build`, `/coverage`) y las de `server/`.
- **Decision**: reemplazar las reglas de la SPA por `/client/node_modules/`, `/client/build/` y
  `/client/coverage/`. Las reglas `.env.*.local` y los logs ya no están anclados y cubren
  `client/`. Las de `server/` no cambian.
- **Rationale**: cumple FR-014 con reglas explícitas por paquete, como ya está hecho para
  `server/`.
- **Restos locales**: después de traer el cambio, la raíz de cada integrante puede tener
  `node_modules/` y `build/` viejos, que dejarían de estar ignorados y aparecerían en
  `git status`. Se documenta borrarlos (quickstart §1 y README). No se dejan reglas de
  transición para la raíz: ocultarían restos que conviene ver y borrar.
- **Alternatives considered**: un `node_modules/` sin anclar que cubra todo (simple, pero
  esconde un `node_modules` en la raíz que no debería existir).

## R7. Cómo verificar que la SPA no cambió

- **Decision**: antes de mover, generar el build de producción en la raíz y guardar una copia
  fuera del repo junto con la salida de la consola. Después de mover, generar el build en
  `client/` y comparar:
  1. la salida de la consola (mismas advertencias, SC-002);
  2. el contenido de los dos `build/` con `diff -r`.
- **Rationale**: el código, las dependencias y el nombre del paquete son los mismos, así que se
  espera que los archivos generados (con hash de contenido en el nombre) coincidan. Es una
  prueba objetiva y barata de FR-004 y FR-007, que complementa el recorrido manual de la
  quickstart. Si aparece una diferencia, solo se acepta en los source maps y debe explicarse.
- **Alternatives considered**: solo el recorrido manual (subjetivo y lento como única
  evidencia); agregar pruebas al cliente (fuera de alcance de la spec).

## R8. Documentación y constitución

- **Decision**:
  - `README.md`: instalación y arranque de la app desde `client/` (versiones en castellano e
    inglés), la mención de `client/src/utils/calculate.js` y la instrucción de pruebas del
    servidor (`npm install` en `client/` en lugar de la raíz). Se agrega una nota de limpieza
    de restos en la raíz.
  - `docs/CLAUDE.md` §2: `client/` pasa a describir la ubicación real; se eliminan la línea
    "`server/` — no existe todavía" (desactualizada desde la Fase 1) y se deja constancia de que
    la transición al monorepo está completa (FR-018).
  - `docs/entregables/diagrama-de-clases.md`: el paquete "Dominio del cliente (src/,
    reutilizado)" pasa a `client/src/`.
  - La constitución **no** se modifica en esta feature. Su cláusula "Transición al monorepo"
    queda cumplida y obsoleta; quitarla es una enmienda PATCH que conviene hacer con
    `/speckit-constitution` después de integrar, para no mezclar gobierno con la mudanza.
  - Las specs `001` y `002` no se tocan (FR-017).
- **Rationale**: FR-015, FR-016, FR-017 y FR-018, con el inventario de referencias vigentes del
  plan (sección "Referencias a actualizar").
