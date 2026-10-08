# Quickstart: validar la mudanza de la SPA a `client/`

**Feature**: `specs/003-client-monorepo/spec.md` | **Date**: 2026-10-08

Guía para comprobar que la mudanza cumple la spec. Los comandos son para Git Bash (Windows),
macOS o Linux, ejecutados desde la raíz del repositorio salvo que se indique otra cosa.

## 0. Línea de base (antes de mover, una sola vez)

Se hace en la rama de la feature **antes** del commit de la mudanza (plan, "Orden de trabajo"
paso 1). Sirve para SC-001, SC-002 y R7.

```bash
mkdir -p "$TMPDIR/cuantoes-003"
npm ci
npm run build 2>&1 | tee "$TMPDIR/cuantoes-003/build-antes.log"
cp -r build "$TMPDIR/cuantoes-003/build-antes"
CI=true npm test -- --watchAll=false --passWithNoTests 2>&1 | tee "$TMPDIR/cuantoes-003/client-tests-antes.txt"

docker compose up -d db
(cd server && npm test) 2>&1 | tail -5 | tee "$TMPDIR/cuantoes-003/tests-antes.txt"   # esperado: 265 passed
```

Anotar la cantidad de pruebas y las advertencias del build (si hay). El comando de pruebas del
cliente debe terminar con `No tests found, exiting with code 0`: sin `--passWithNoTests` sale con
código 1, porque el cliente no tiene pruebas.

## 1. Después de traer el cambio (cada integrante)

Limpiar los restos locales de la raíz, que ya no están ignorados (R6):

```bash
rm -rf node_modules build
git status --short                                      # no debe listar node_modules/ ni build/
```

Instalar las dependencias de cada paquete:

```bash
(cd client && npm ci)
(cd server && npm ci)
```

## 2. Estructura (FR-001, FR-002, FR-003)

```bash
ls                                    # client/ y server/; sin src/, public/ ni package.json
git ls-files client | wc -l           # esperado: 37
git log --follow --oneline -- client/src/utils/calculate.js | tail -3
```

El último comando debe mostrar commits anteriores a la mudanza (por ejemplo,
`5c699b9c Implementacion de Contexts, ...`). Repetirlo con un archivo de `public/` y con
`client/package.json`.

## 3. Cliente (US1, SC-002, SC-003)

### Build comparado

```bash
cd client
npm run build 2>&1 | tee "$TMPDIR/cuantoes-003/build-despues.log"
diff "$TMPDIR/cuantoes-003/build-antes.log" "$TMPDIR/cuantoes-003/build-despues.log"   # sin advertencias nuevas
diff -r "$TMPDIR/cuantoes-003/build-antes" build && echo "BUILD IDÉNTICO"
CI=true npm test -- --watchAll=false --passWithNoTests     # código 0, como en §0
```

Esperado: `BUILD IDÉNTICO`. Si `diff -r` muestra diferencias, solo se aceptan en archivos
`.map` y hay que poder explicarlas (R7).

### Recorrido manual

`npm start` en `client/` y, en el navegador (también en un ancho de celular, 320 px):

1. Cargar tres personas.
2. Crear dos categorías, elegir participantes distintos en cada una (probar "Seleccionar todos")
   y cargar montos, incluido uno que no divide exacto.
3. Ver el resultado, con unificación de pagos y eliminación de cadenas.
4. Eliminar una persona y una categoría, y ver que el resultado se actualiza.
5. Navegar entre `/`, `/persons`, `/categories`, `/categories/:id` y `/result` con los enlaces
   de la app.

Comparar con la misma carga en el sitio publicado actual (o en `main`): mismas pantallas y
mismos resultados.

### Sitio estático local (opcional)

```bash
npx serve -s build        # sin instalarlo en el proyecto
```

## 4. Servidor (US2, SC-001)

Con `docker compose up -d db` y las dependencias de `client/` instaladas:

```bash
cd server
npm test                                              # esperado: la misma cantidad que en §0 (265)
```

Si falla con `Cannot find module 'uuid'` desde `client/src/classes/Peer.js`, faltan las
dependencias del cliente: `(cd client && npm ci)`.

Comprobar que el dominio no está duplicado (US2-3):

```bash
git ls-files | grep -E '(^|/)calculate\.js$'          # esperado: solo client/src/utils/calculate.js
```

## 5. Contenedores (FR-010, SC-004)

```bash
docker compose down
docker compose build --no-cache api
docker compose up -d
docker compose logs api | tail -5                     # migraciones aplicadas, API escuchando en 3001
docker compose exec api ls /repo/client/src           # solo classes y utils
```

Recorrer los 15 pasos de
[specs/002-groups-expenses-settlements/quickstart.md](../002-groups-expenses-settlements/quickstart.md)
§2 contra `http://localhost:3001`: todas las respuestas deben coincidir con las esperadas.

## 6. Referencias residuales (SC-006)

```bash
EXCL=(-- . ':!specs/001-*' ':!specs/002-*' ':!specs/003-*' ':!.specify/' ':!client/')
git grep -nE "(\.\./)+src/(classes|utils)|COPY src/|/repo/src|!src/" "${EXCL[@]}"
git grep -nE "(^|[^a-z/])src/(classes|utils)|\(src/|en la raíz: el cálculo" "${EXCL[@]}"
```

Esperado: los dos sin resultados. El primero detecta rutas relativas y de Docker; el segundo,
menciones en texto (README, comentarios, diagramas). Se excluye `.specify/` porque el historial
de la constitución menciona `src/` como registro. Revisar además a mano que el README explique la instalación desde
`client/` y que `docs/CLAUDE.md` §2 deje constancia de la transición completa.

## 7. Sitio publicado (US1-4, SC-005) — después del merge a `main`

El sitio de este repositorio es `https://distributionm.netlify.app/` (el enlace del README).
`cuantoes.com.ar` es otra aplicación (Next.js) y no se valida acá (R4).

1. En el panel de Netlify, confirmar que el sitio está conectado al repositorio con despliegue
   automático desde `main`, que el despliegue usó `client` como directorio base (el log lo indica
   al principio) y que terminó bien.
2. Abrir `https://distributionm.netlify.app/` con las herramientas de desarrollo abiertas: la app
   carga, sin errores nuevos en la consola ni recursos con 404 (íconos, logos, `manifest.json`).
3. Rutas (R5): `/` y `/manifest.json` responden 200, `/persons` responde 404 como antes, y
   `/sitemap.xml` pasa a responder 200 (el despliegue de antes era anterior al commit que lo
   agregó):

   ```bash
   for p in / /manifest.json /persons /sitemap.xml; do
     curl -s -o /dev/null -w "%{url_effective} %{http_code}\n" "https://distributionm.netlify.app$p"
   done
   ```

   En Git Bash no usar `$p` dentro de `-w`: la conversión de rutas de MSYS cambia `/` por
   `C:/Program Files/Git/`.

Si el despliegue falla porque el panel tiene otra configuración, alinearla con `netlify.toml`
(R4) y volver a desplegar.
