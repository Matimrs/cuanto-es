# Feature Specification: Mudanza de la SPA a `client/` (transición al monorepo)

**Feature Branch**: `feature/003-client-monorepo` (sobre la Fase 2)

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Mudanza de la SPA React a client/ (transición al monorepo exigida por
la constitución v2.1.0, Restricciones Técnicas). Mover la app React que hoy vive en la raíz (src/,
public/, package.json, package-lock.json y la configuración asociada) a client/, de modo que el
repo quede con client/ y server/ como paquetes hermanos según docs/CLAUDE.md §3. Es una feature
propia, sin cambios funcionales en la app ni trabajo de backend: la SPA debe comportarse
exactamente igual, el build y el despliegue estático en Netlify deben seguir funcionando, y el
servidor (que hoy reutiliza el dominio de cálculo importándolo desde src/, también dentro de
Docker vía /repo/src) debe seguir resolviendo esas clases desde la nueva ruta con todos sus tests
en verde. Actualizar documentación, Dockerfile/docker-compose, .gitignore y cualquier ruta
relativa que apunte a la ubicación anterior."

## Contexto

La constitución (Restricciones Técnicas → "Transición al monorepo") permite que la SPA siga en la
raíz del repositorio hasta una feature dedicada a moverla a `client/`. Esa feature debe ser propia
(sin mezclarse con trabajo de backend) y debe estar terminada antes de cerrar la Fase 3 del
roadmap (el cliente consumiendo la API). Esta es esa feature, y va primero dentro de la Fase 3
para que el trabajo siguiente (conectar la SPA con la API) se haga directamente sobre la
estructura definitiva.

Hoy dependen de la ubicación de la SPA:

- La propia app: su código, sus recursos estáticos, sus dependencias y sus comandos de
  desarrollo y de build.
- El servidor, que reutiliza el reparto y el cálculo de deudas del cliente (Principio I) en su
  código y en sus pruebas de dominio.
- La imagen de contenedor del servidor, que copia ese dominio desde la raíz.
- El sitio publicado, que se construye a partir del repositorio.
- La documentación (README, `docs/CLAUDE.md`, entregables) y las reglas de archivos ignorados.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La app sigue funcionando igual (Priority: P1)

Quien usa CuantoEs, en la versión publicada o en un entorno de desarrollo, no nota ningún cambio:
carga personas, arma categorías, elige participantes, ve el resultado de quién le debe a quién con
la eliminación de cadenas, y navega entre las mismas pantallas con el mismo aspecto.

**Why this priority**: Es la condición de la feature: una mudanza que rompe la app no sirve, y la
app actual es la base que el resto del roadmap va a adaptar.

**Independent Test**: Desde `client/`, instalar dependencias, iniciar la app en modo desarrollo y
generar el build de producción; recorrer los flujos principales y comparar con la versión anterior
a la mudanza (mismas pantallas, mismos resultados para los mismos datos).

**Acceptance Scenarios**:

1. **Given** un clon limpio del repositorio, **When** un integrante instala las dependencias de
   `client/` y arranca la app en modo desarrollo, **Then** la app abre en el navegador y todos los
   flujos (personas, categorías, participantes, resultados, eliminación de cadenas, borrado) se
   comportan igual que antes.
2. **Given** las dependencias de `client/` instaladas, **When** se genera el build de producción,
   **Then** termina sin errores ni advertencias nuevas respecto del build anterior a la mudanza.
3. **Given** un mismo conjunto de personas, categorías y montos, **When** se calcula el resultado
   antes y después de la mudanza, **Then** los resultados son idénticos.
4. **Given** el cambio integrado a la rama que publica el sitio, **When** se despliega, **Then**
   el sitio publicado se construye desde `client/` y funciona igual, incluidos los recursos
   estáticos (íconos, logos, manifest, sitemap). La navegación directa a rutas internas
   (p. ej. `/persons`) se comporta igual que antes: hoy el sitio responde 404 (ver Assumptions).

---

### User Story 2 - El servidor sigue calculando con el dominio del cliente (Priority: P1)

El servidor sigue reutilizando el mismo reparto y cálculo de deudas de la app (Principio I), ahora
desde su nueva ubicación, tanto al correr nativo como dentro del contenedor.

**Why this priority**: La Fase 2 depende de ese dominio para calcular las liquidaciones. Si el
servidor deja de encontrarlo, el backend entero queda inutilizable.

**Independent Test**: Correr toda la suite de pruebas del servidor y levantar los contenedores;
crear un grupo con gastos y pedir sus liquidaciones contra la API dentro del contenedor.

**Acceptance Scenarios**:

1. **Given** la base de pruebas levantada y las dependencias de `client/` y `server/`
   instaladas, **When** se corre la suite del servidor, **Then** pasan todas las pruebas (Fase 1
   y Fase 2), la misma cantidad que antes de la mudanza.
2. **Given** los contenedores construidos desde cero, **When** se recorre el escenario de prueba
   manual de la Fase 2 (grupo, miembros, categorías, gastos, liquidaciones, pagos) contra la API
   del contenedor, **Then** todas las respuestas coinciden con las esperadas.
3. **Given** el servidor y el cliente, **When** se busca qué código de reparto y cálculo usa cada
   uno, **Then** ambos usan los mismos archivos de `client/`: no existe una copia duplicada del
   dominio en ningún otro lugar.

---

### User Story 3 - Un integrante nuevo se orienta con la documentación (Priority: P2)

Un integrante del equipo (o el docente que corrige) que clona el repositorio encuentra una
estructura con `client/` y `server/` como paquetes hermanos, y la documentación le dice cómo
levantar cada uno sin referencias a la ubicación anterior.

**Why this priority**: Evita confusiones y pasos rotos, pero no bloquea a quien ya conoce el
proyecto.

**Independent Test**: Seguir solamente el README desde un clon limpio y lograr levantar el
cliente, el servidor y sus pruebas.

**Acceptance Scenarios**:

1. **Given** un clon limpio, **When** alguien sigue el README, **Then** logra levantar el
   cliente, el servidor y correr las pruebas sin pasos que fallen ni rutas inexistentes.
2. **Given** la documentación del proyecto (README, `docs/CLAUDE.md`, entregables) y la
   configuración, **When** se busca cualquier referencia a la SPA en la raíz, **Then** no queda
   ninguna vigente (las de specs de features anteriores quedan como registro histórico).
3. **Given** el historial del repositorio, **When** se consulta la historia de cualquier archivo
   movido, **Then** se ven también los cambios anteriores a la mudanza.

---

### Edge Cases

- **Restos en la raíz**: después de la mudanza no debe quedar en la raíz ningún archivo propio de
  la SPA (código, recursos, manifiesto de dependencias, lockfile). Los artefactos locales no
  versionados (dependencias instaladas, build anterior) los limpia cada integrante; la
  documentación lo indica.
- **Dependencias del cliente sin instalar**: el dominio que reutiliza el servidor importa una
  dependencia del cliente. Si alguien corre las pruebas del servidor sin haber instalado las
  dependencias de `client/`, el error debe estar documentado con su solución (instalarlas).
- **Contenedor**: la imagen del servidor debe seguir incluyendo solo lo que necesita (el servidor
  y el dominio del cliente), sin copiar el resto de `client/` ni sus dependencias de desarrollo.
- **Sitio publicado**: si la plataforma de publicación está configurada para construir desde la
  raíz, el primer despliegue después de la mudanza fallaría; la configuración de publicación debe
  quedar versionada en el repositorio apuntando a `client/`, para que no dependa de un cambio
  manual en el panel.
- **Archivos ignorados**: las reglas de archivos ignorados deben seguir excluyendo dependencias
  instaladas, builds y archivos de entorno, ahora dentro de `client/`, sin dejar de cubrir los de
  `server/`.
- **Ramas abiertas**: si hay ramas con cambios en `src/` sin integrar, al traerlas después de la
  mudanza sus cambios deben aplicarse sobre `client/src/`; se documenta cómo hacerlo.

## Requirements *(mandatory)*

### Functional Requirements

**Estructura**

- **FR-001**: La SPA (código, recursos estáticos, manifiesto de dependencias, lockfile y su
  configuración de herramientas) DEBE vivir en `client/`, y `client/` y `server/` DEBEN quedar
  como paquetes hermanos en la raíz, según la arquitectura objetivo de `docs/CLAUDE.md` §3.
- **FR-002**: En la raíz NO DEBE quedar ningún archivo propio de la SPA. Quedan solo los archivos
  que son del repositorio en su conjunto (documentación, specs, configuración de contenedores, de
  Spec Kit, de publicación y de archivos ignorados).
- **FR-003**: Los archivos DEBEN moverse conservando su historial, de modo que la historia de
  cada archivo movido siga mostrando sus cambios anteriores.

**Sin cambios funcionales**

- **FR-004**: El comportamiento de la SPA NO DEBE cambiar: mismas pantallas, mismos flujos,
  mismos resultados de cálculo y mismo aspecto.
- **FR-005**: Los comandos de la SPA (desarrollo, build y pruebas) DEBEN seguir siendo los
  mismos, ejecutados desde `client/`.
- **FR-006**: Las versiones de las dependencias de la SPA NO DEBEN cambiar; el lockfile se mueve
  tal cual.
- **FR-007**: El código de la SPA NO DEBE modificarse más allá de lo estrictamente necesario para
  la mudanza (se espera que no haga falta ningún cambio).

**Servidor**

- **FR-008**: El servidor DEBE seguir reutilizando el reparto y el cálculo de deudas del cliente
  desde `client/` (Principio I), en su código y en sus pruebas, sin duplicarlo.
- **FR-009**: Toda la suite de pruebas del servidor DEBE pasar después de la mudanza, con la misma
  cantidad de pruebas que antes.
- **FR-010**: La imagen de contenedor del servidor DEBE construirse con el dominio del cliente
  tomado de `client/`, incluir solo los archivos que el servidor necesita y funcionar igual que
  antes (migraciones al arrancar y cálculo de liquidaciones).
- **FR-011**: El servidor NO DEBE tener cambios de comportamiento: solo cambian las rutas hacia el
  dominio del cliente y los comentarios que las mencionan.

**Publicación**

- **FR-012**: La configuración de publicación del sitio estático DEBE quedar versionada en el
  repositorio y apuntar a `client/` (directorio base, comando de build y carpeta publicada), de
  modo que el sitio se construya correctamente sin cambios manuales en el panel de la plataforma.
- **FR-013**: El sitio publicado DEBE seguir sirviendo la app y sus recursos estáticos igual que
  antes. La respuesta a la navegación directa a rutas internas NO DEBE cambiar en esta feature.

**Configuración y documentación**

- **FR-014**: Las reglas de archivos ignorados DEBEN cubrir las dependencias instaladas, el build
  y los archivos de entorno locales de `client/`, y seguir cubriendo los de `server/`.
- **FR-015**: El README DEBE explicar cómo instalar y levantar el cliente desde `client/`, y las
  instrucciones de pruebas del servidor DEBEN indicar que hay que instalar las dependencias de
  `client/` (por el dominio compartido).
- **FR-016**: `docs/CLAUDE.md` (estado actual y arquitectura), los entregables académicos que
  mencionen la ubicación del dominio del cliente y los comentarios de la configuración de
  contenedores DEBEN reflejar la nueva estructura.
- **FR-017**: Las specs de features anteriores NO DEBEN reescribirse: son registro histórico de
  lo que se decidió en su momento.
- **FR-018**: Como la mudanza cumple la regla de transición de la constitución, la documentación
  DEBE dejar constancia de que esa transición quedó completa (sin cambiar los principios).

### Key Entities

No hay entidades de datos nuevas ni cambios en el modelo. Los "elementos" de esta feature son
partes del repositorio:

- **Paquete del cliente (`client/`)**: la SPA con su código, recursos, dependencias y comandos.
- **Paquete del servidor (`server/`)**: la API; depende del dominio del cliente para el cálculo.
- **Dominio compartido**: las clases y utilidades de reparto y cálculo de deudas del cliente que
  el servidor reutiliza. Vive solo en `client/`.
- **Configuración del repositorio**: contenedores, publicación, archivos ignorados y
  documentación, que viven en la raíz y referencian a los dos paquetes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de las pruebas del servidor pasan después de la mudanza, con la misma
  cantidad de pruebas que antes (265 al cierre de la Fase 2).
- **SC-002**: El build de producción del cliente termina sin errores y sin advertencias nuevas
  respecto del build anterior a la mudanza.
- **SC-003**: En un recorrido manual de todos los flujos de la app con los mismos datos, el 100 %
  de las pantallas y resultados coinciden con los de antes de la mudanza.
- **SC-004**: El escenario de prueba manual de la Fase 2 recorrido contra la API en contenedores
  construidos desde cero da el 100 % de las respuestas esperadas.
- **SC-005**: El sitio publicado, después del primer despliegue posterior a la integración,
  carga la app y sus recursos estáticos, y una búsqueda de errores de carga en el navegador no
  muestra ninguno nuevo.
- **SC-006**: Cero referencias vigentes a la SPA en la raíz en la documentación y la
  configuración (excluidas las specs históricas).
- **SC-007**: El 100 % de los archivos movidos conservan su historial anterior a la mudanza.
- **SC-008**: Una persona que no participó de la mudanza logra levantar el cliente y correr las
  pruebas del servidor desde un clon limpio en menos de 15 minutos, siguiendo solo el README
  (sin contar el tiempo de descarga de dependencias).

## Assumptions

- **Feature propia**: por la regla de transición de la constitución, esta feature no incluye
  ningún trabajo funcional del cliente ni del servidor. Conectar la SPA con la API es la feature
  siguiente de la Fase 3.
- **Sin espacios de trabajo compartidos**: `client/` y `server/` siguen siendo paquetes
  independientes, cada uno con sus dependencias y su lockfile. No se agrega un manifiesto de
  dependencias en la raíz ni un gestor de espacios de trabajo; eso se puede evaluar más adelante
  si hace falta.
- **Dependencia del dominio compartido**: el dominio del cliente que reutiliza el servidor sigue
  importando sus dependencias desde las del cliente. Fuera del contenedor, eso exige instalar las
  dependencias de `client/` antes de correr el servidor o sus pruebas (igual que hoy exige
  instalarlas en la raíz). Dentro del contenedor se resuelve como hasta ahora.
- **Publicación**: el sitio se publica en Netlify desde la rama principal. Se asume que una
  configuración versionada en el repositorio tiene prioridad sobre la del panel, así que no hace
  falta tocar el panel. Si alguien del equipo configuró en el panel valores que contradicen la
  configuración versionada, hay que alinearlos al integrar.
- **Validación del despliegue**: el sitio publicado solo se puede validar después de integrar a la
  rama principal. Antes, la validación es local con el build de producción servido como sitio
  estático.
- **Artefactos locales**: las dependencias instaladas y el build que hoy existen en la raíz no
  están versionados. Cada integrante los borra a mano después de traer el cambio; la
  documentación lo indica.
- **Navegación directa a rutas internas**: verificado el 2026-10-08, el sitio publicado responde
  200 en `/` y 404 en `/persons` (no hay regla de reescritura hacia `index.html`). Corregirlo es
  un cambio de comportamiento, así que queda fuera de esta feature. Se recomienda resolverlo en la
  feature siguiente de la Fase 3, que de todos modos cambia la navegación al agregar grupos.
- **El cliente no se containeriza** (`docs/CLAUDE.md` §8): sigue corriendo nativo.
- **Orden de integración**: esta rama sale de la Fase 2 sin integrar, así que se integra después
  de las Fases 1 y 2 (001 → 002 → 003).
- **Fuera de alcance**: cambios de comportamiento o de aspecto de la SPA, actualizar dependencias,
  agregar pruebas al cliente, cambiar el backend más allá de las rutas al dominio, y reescribir
  specs anteriores.
