<!--
Sync Impact Report
==================
Version change: 1.0.0 → 2.0.0 (MAJOR)
Motivo: se incorpora docs/CLAUDE.md. El Principio V ("100% en el cliente, sin backend") se
redefine de forma incompatible: el proyecto pasa a ser un sistema cliente-servidor con
persistencia, autenticación y pagos.

Modified principles:
  - I. Exactitud del Cálculo (NO NEGOCIABLE) → sin renombrar; se agregan la reutilización
    obligatoria de calculate()/distribute(), el cálculo en el servidor y la precisión decimal
    en la persistencia.
  - II. Dominio Separado de la Interfaz → II. Dominio Reutilizable y Fuente de Verdad en el
    Servidor (el estado ya no vive en Context en memoria; el Context consume la API).
  - III. Pruebas de la Lógica de Reparto → sin renombrar; se agregan las pruebas de API y el
    plan de pruebas formal derivado de los casos de uso.
  - IV. Experiencia Responsive y Clara → sin cambios de fondo.
  - V. Simplicidad y Ejecución 100% en el Cliente → V. Arquitectura Cliente-Servidor con Stack
    Fijo (redefinido: se elimina "sin backend" y "sin servicios externos"; se conserva YAGNI).
Added principles:
  - VI. Seguridad y Privacidad de los Datos
  - VII. Persistencia e Historial
Added sections:
  - Entregables Académicos
Modified sections:
  - Restricciones Técnicas: monorepo client/ + server/, Docker Compose, Prisma, PostgreSQL,
    JWT, Mercado Pago; se elimina la prohibición de backend y la estructura de un solo paquete.
  - Flujo de Desarrollo y Calidad: commits en español en modo imperativo, ramas cortas
    validadas por el equipo, manejo de .env.
Removed sections: ninguna.
Templates / dependientes: no se modifican (leen la constitución en tiempo de ejecución).
Follow-up TODOs:
  - TODO(DEPLOY_TARGET): docs/CLAUDE.md no define dónde se despliegan la API y la base de
    datos; el despliegue estático en Netlify sólo cubre al cliente.
  - La app React todavía vive en la raíz (src/); docs/CLAUDE.md la ubica en client/. La
    migración al monorepo queda como tarea de la Fase 1.
-->

# CuantoEs Constitution

## Core Principles

### I. Exactitud del Cálculo (NO NEGOCIABLE)

El propósito del sistema es repartir gastos de forma equitativa; un resultado incorrecto
invalida el producto.

- Para cada categoría, la suma de lo que reciben los acreedores DEBE ser igual a la suma de lo
  que pagan los deudores, y cada miembro DEBE quedar con un aporte neto igual al promedio de la
  categoría.
- La unificación de pagos y la eliminación de cadenas (`utils/calculate.js`) DEBEN preservar el
  saldo neto de cada miembro: ninguna simplificación puede alterar cuánto debe o recibe alguien.
- `utils/calculate.js` y `Category.distribute()` DEBEN reutilizarse; NO DEBEN reescribirse ni
  reemplazarse por otro algoritmo. Para usarlos en el backend se adapta la entrada (los
  resultados de consultar `Expense` agrupados por categoría), no el algoritmo.
- El cálculo oficial de los `Settlement` DEBE hacerse en el servidor.
- Los montos DEBEN guardarse en un tipo decimal (nunca float) con 2 decimales y mostrarse
  redondeados a centavos. Los errores de punto flotante NO DEBEN producir deudas residuales
  visibles (p. ej. `0.000001`).
- El cálculo DEBE ser determinista: las mismas entradas producen siempre el mismo resultado.

**Rationale**: los usuarios usan el resultado para transferirse dinero real, incluso a través
de Mercado Pago. El algoritmo existente es la pieza más valiosa del proyecto.

### II. Dominio Reutilizable y Fuente de Verdad en el Servidor

- Las reglas de negocio (reparto, promedios, unificación, cadenas) DEBEN vivir en las clases de
  dominio (`Category`, `Person`, `Peer`) y en `utils/`, como JavaScript puro sin dependencias
  de React, Express ni Prisma. Así el mismo código corre en el cliente y en el servidor.
- La base de datos, accedida a través de la API, es la fuente de verdad. Los Context del cliente
  (`PersonContext`, `CategoryContext`, `ResultContext`) DEBEN migrar de estado en memoria a
  consumir la API, sin conservar copias del estado que puedan divergir.
- En el servidor, la lógica DEBE seguir el flujo `routes/` → `controllers/` → acceso a datos
  (Prisma en `models/`). Los controladores NO DEBEN reimplementar cálculos de dominio.
- Los componentes de `client/` DEBEN limitarse a presentar datos y despachar acciones.
- La app React existente DEBE adaptarse de forma incremental; NO DEBE rehacerse desde cero.

**Rationale**: separar el dominio permite probarlo aisladamente y llevarlo al backend sin
riesgo de romper el cálculo.

### III. Pruebas de la Lógica de Reparto

- Todo cambio en `utils/calculate.js` o en los métodos de las clases de dominio DEBE ir
  acompañado de pruebas automatizadas con Jest que cubran el caso modificado.
- Las pruebas DEBEN verificar las invariantes del Principio I (conservación de saldos, ausencia
  de cadenas, redondeo) e incluir casos borde: un solo miembro, gastos iguales, montos en cero,
  miembros presentes en varias categorías e invitados sin cuenta.
- Un bug de cálculo corregido DEBE agregar una prueba de regresión que lo reproduzca.
- Se RECOMIENDAN las pruebas de integración de los endpoints críticos (auth, gastos,
  settlements) y de los flujos de UI críticos; se vuelven obligatorias en la Fase 7.
- Además de los tests automatizados DEBE existir un plan de pruebas formal derivado de los
  casos de uso (ver Entregables Académicos). Son artefactos distintos y uno no sustituye al
  otro.

**Rationale**: el algoritmo de eliminación de cadenas es la parte más compleja y más propensa a
errores, y la cátedra evalúa por separado el plan de pruebas.

### IV. Experiencia Responsive y Clara

- Toda pantalla DEBE poder usarse en anchos de celular (≥ 320 px) y de escritorio sin scroll
  horizontal.
- La interfaz y los mensajes al usuario DEBEN estar en castellano rioplatense consistente.
- Las acciones destructivas (eliminar miembros, categorías, gastos o selecciones masivas) DEBEN
  ser explícitas, y su efecto DEBE reflejarse de inmediato en los resultados.
- Las entradas numéricas DEBEN validarse (no negativas, numéricas) en el cliente para dar una
  respuesta inmediata, y DEBEN volver a validarse en el servidor.

**Rationale**: la app se usa sobre todo desde el celular, en el momento de dividir una cuenta.

### V. Arquitectura Cliente-Servidor con Stack Fijo

- El sistema es un monorepo con dos paquetes: `client/` (React) y `server/` (Node + Express).
- El stack está decidido y NO DEBE rediscutirse salvo que aparezca un problema concreto, que se
  documenta en el plan de la feature: Node.js + Express, PostgreSQL, Prisma, JWT + bcrypt,
  Docker Compose (servicios `api` y `db`) y el SDK oficial de Mercado Pago para Node.
- Agregar una dependencia fuera de ese stack DEBE justificarse en el plan de la feature. En el
  cliente se DEBE preferir Bulma y las librerías ya instaladas antes que sumar otra librería de
  UI.
- Se aplica YAGNI: no se agregan abstracciones, capas ni configuraciones sin una necesidad
  concreta presente.
- El borrador de endpoints de `docs/CLAUDE.md` es un punto de partida y no un contrato cerrado.
  Los cambios de contrato DEBEN reflejarse en los artefactos de la feature (plan/contratos).

**Rationale**: un stack único en JavaScript reduce la fricción de un equipo chico con plazos
académicos ajustados, y el modelo relacional se corresponde directamente con el ERD y el
diagrama de clases que pide la cátedra.

### VI. Seguridad y Privacidad de los Datos

- Las contraseñas DEBEN guardarse sólo como hash bcrypt; nunca en texto plano ni en logs.
- La autenticación DEBE usar JWT sin sesiones del lado del servidor. Todo endpoint, salvo
  `/auth/*`, DEBE exigir un token válido mediante middleware.
- Cada endpoint que acceda a un grupo o a sus recursos (categorías, gastos, settlements) DEBE
  comprobar que el usuario autenticado es miembro de ese grupo.
- Toda entrada a la API DEBE validarse en middleware antes de llegar a los controladores.
- Los secretos (credenciales de la base de datos, secreto JWT, tokens de Mercado Pago) DEBEN
  vivir en `server/.env`, que NUNCA se commitea. DEBE mantenerse un `server/.env.example`
  actualizado.
- Los datos de los usuarios sólo DEBEN enviarse a la API propia y a Mercado Pago (sólo lo
  necesario para crear un pago); NO DEBEN enviarse a otros servicios externos.

**Rationale**: el sistema maneja cuentas reales y liquidaciones de dinero.

### VII. Persistencia e Historial

- Los gastos DEBEN registrarse de a uno (`Expense`: quién pagó, monto, descripción, fecha), no
  como totales por persona y categoría.
- El `Group` reemplaza a la sesión implícita única de la app original. Toda categoría, gasto y
  settlement pertenece a un grupo.
- `GroupMember` DEBE permitir invitados sin cuenta (`user_id` nulo, con `alias`), como ocurre
  hoy en la app.
- Los resultados de `calculate()` DEBEN guardarse como `Settlement`, con estado pagado o
  pendiente.
- Los cambios de esquema DEBEN hacerse con migraciones de Prisma versionadas; NO DEBE
  modificarse la base a mano.

**Rationale**: el historial y el estado de pago son el valor que agrega el sistema frente a la
app original, y son la base del dashboard y de la exportación.

## Restricciones Técnicas

- **Estructura objetivo**:
  - `client/`: React 18, JavaScript, `.jsx` para componentes, Create React App, React Router 6
    y Bulma.
  - `server/src/{routes,controllers,models,middleware}` e `index.js`.
  - `server/prisma/schema.prisma`.
  - `docker-compose.yml` y `CLAUDE.md` en la raíz.
- **Modelo de datos base**: `User`, `Group`, `GroupMember`, `Category`, `Expense`, `Settlement`,
  según `docs/CLAUDE.md` §4.
- **Contenedores**: Docker Compose levanta `db` (postgres:16) y `api` (puerto 3001). El cliente
  NO se containeriza y corre de forma nativa con `npm start`.
- **Build y lint**: `npm run build` del cliente DEBE completarse sin errores, y el cliente DEBE
  respetar la configuración ESLint `react-app` sin advertencias nuevas.
- **Despliegue**: TODO(DEPLOY_TARGET). El cliente puede seguir desplegándose como sitio
  estático (Netlify); el destino de la API y de la base de datos está pendiente.
- NO se introducen TypeScript, gestores de estado externos, otro ORM u otra base de datos sin
  enmendar esta constitución.

## Entregables Académicos

CuantoEs es el proyecto integrador de Seminario Integrador (UTN FRSF). Cada feature DEBE
mantener al día los artefactos que evalúa la cátedra:

- **Diagrama de casos de uso + fichas de casos de uso** (UML), para la Plantilla 02. Una lista
  de endpoints no lo reemplaza.
- **Diagrama de clases UML**, para la Plantilla 03. Se entrega además del ERD o schema de
  Prisma, no en su lugar.
- **Plan de pruebas formal derivado de los casos de uso** (Unidad 6).
- **Informe final y defensa oral**.

El orden de trabajo sigue el roadmap de `docs/CLAUDE.md` §6:

1. Backend base y auth.
2. CRUD y migración del cálculo.
3. Cliente consumiendo la API.
4. Dashboard.
5. Mercado Pago.
6. Exportar.
7. Tests y documentación final.

Una feature que adelanta una fase posterior DEBE justificarlo en su plan.

## Flujo de Desarrollo y Calidad

- Las features nuevas siguen el flujo de Spec Kit: `/speckit-specify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`. El plan DEBE incluir un "Constitution Check" que
  verifique los siete principios.
- Cada feature del roadmap se desarrolla en una rama corta que se integra a `main` cuando el
  equipo la valida.
- Antes de integrar a `main`, `npm test` DEBE pasar en los paquetes afectados y el build del
  cliente DEBE completarse sin errores.
- Los mensajes de commit DEBEN escribirse en español y en modo imperativo (`Agrega endpoint de
  login`, no `Agregado endpoint de login`).
- Toda violación justificada de un principio DEBE documentarse en la sección "Complexity
  Tracking" del plan correspondiente.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica o convención del repositorio.
  `docs/CLAUDE.md` es la guía de contexto del día a día. Si ambos documentos se contradicen,
  DEBE enmendarse esta constitución para volver a alinearlos.
- Las enmiendas se hacen con `/speckit-constitution`. Cada una DEBE registrar el Sync Impact
  Report al inicio de este archivo y actualizar la fecha de la última enmienda.
- Versionado semántico de la constitución:
  - **MAJOR**: se elimina un principio o se lo redefine de forma incompatible.
  - **MINOR**: se agrega un principio o una sección, o se amplía de forma sustancial una guía.
  - **PATCH**: aclaraciones, cambios de redacción o correcciones sin cambio semántico.
- Cada plan y cada revisión de código DEBE verificar el cumplimiento de los principios; la
  complejidad adicional DEBE justificarse explícitamente.

**Version**: 2.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
