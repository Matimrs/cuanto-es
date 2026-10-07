# Feature Specification: Backend base y autenticación (Fase 1)

**Feature Branch**: `001-backend-auth-base` (todavía no se creó; hoy se trabaja sobre `main`)

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Fase 1 de @docs/CLAUDE.md: backend base. Un usuario puede registrarse con nombre, email y contraseña, e iniciar sesión obteniendo un token. El sistema persiste el modelo de datos completo (User, Group, GroupMember, Category, Expense, Settlement), aunque en esta fase solo se exponen los endpoints de autenticación. Fuera de alcance: CRUD de grupos/gastos, cambios en el frontend, Mercado Pago."

## Clarifications

### Session 2026-10-07

- Q: ¿Se incluye en esta fase la consulta "quién soy" con el token, o solo registro e inicio de
  sesión? → A: Se incluye la consulta de identidad propia como parte de la autenticación (P2),
  junto con la verificación de token reutilizable.
- Q: ¿Los montos están en una sola moneda o un grupo puede usar varias? → A: Una sola moneda en
  todo el sistema (ARS); los montos no guardan la moneda.
- Q: ¿El dueño de un grupo pasa automáticamente a ser miembro, o son roles independientes? →
  A: Son roles independientes: el dueño puede administrar el grupo sin ser miembro, y el acceso
  al grupo corresponde a sus miembros o a su dueño.
- Q: ¿Cuánto dura un token de acceso antes de tener que iniciar sesión de nuevo? → A: 7 días.
- Q: ¿El registro debe avisar explícitamente que un email ya está en uso? → A: Sí, con el
  mensaje "Ese email ya está registrado"; el inicio de sesión sigue siendo genérico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrarse con una cuenta propia (Priority: P1)

Una persona que quiere usar CuantoEs para dividir gastos con otros crea su cuenta indicando su
nombre, su email y una contraseña. A partir de ese momento tiene una identidad en el sistema
con la que más adelante podrá crear grupos y aparecer como miembro de ellos.

**Why this priority**: sin cuentas no existe el concepto de usuario y nada de lo que sigue en el
roadmap (grupos, historial, pagos) tiene a quién pertenecer. Es la puerta de entrada al sistema.

**Independent Test**: se envía una solicitud de registro con datos válidos y se comprueba que
la cuenta queda creada, que el sistema devuelve los datos públicos del usuario junto con un
token de acceso y que un segundo registro con el mismo email se rechaza.

**Acceptance Scenarios**:

1. **Given** que no existe ninguna cuenta con el email `ana@ejemplo.com`, **When** alguien se
   registra con nombre "Ana", ese email y una contraseña válida, **Then** la cuenta se crea, la
   respuesta incluye el identificador, nombre y email del usuario (nunca la contraseña) y un
   token de acceso.
2. **Given** que ya existe una cuenta con `ana@ejemplo.com`, **When** alguien intenta
   registrarse con `ANA@Ejemplo.com `, **Then** el registro se rechaza indicando que el email ya
   está en uso y no se crea ninguna cuenta.
3. **Given** cualquier estado, **When** alguien intenta registrarse con un email mal formado,
   sin nombre o con una contraseña que no cumple la política mínima, **Then** el registro se
   rechaza con un mensaje en castellano que indica qué campo es inválido y por qué.

---

### User Story 2 - Iniciar sesión y obtener un token (Priority: P1)

Un usuario registrado ingresa su email y su contraseña y recibe un token de acceso que le
permite identificarse frente al sistema en las operaciones siguientes, sin volver a escribir sus
credenciales mientras el token siga vigente.

**Why this priority**: el registro solo sirve si después el usuario puede identificarse. Las
dos historias forman juntas el MVP de la fase.

**Independent Test**: con una cuenta ya creada, se inicia sesión con las credenciales
correctas y se obtiene un token; con una contraseña incorrecta o un email inexistente el inicio
de sesión se rechaza.

**Acceptance Scenarios**:

1. **Given** una cuenta existente de Ana, **When** inicia sesión con su email (sin importar
   mayúsculas o espacios alrededor) y la contraseña correcta, **Then** recibe un token de acceso
   vigente y sus datos públicos.
2. **Given** una cuenta existente de Ana, **When** inicia sesión con una contraseña incorrecta,
   **Then** el sistema rechaza el intento con un mensaje genérico ("Email o contraseña
   incorrectos") que no revela cuál de los dos datos falló.
3. **Given** que no existe ninguna cuenta con `nadie@ejemplo.com`, **When** alguien intenta
   iniciar sesión con ese email, **Then** recibe exactamente el mismo mensaje genérico que en el
   escenario anterior.

---

### User Story 3 - Consultar la propia identidad con el token (Priority: P2)

Un usuario que inició sesión presenta su token y obtiene sus datos públicos (identificador,
nombre y email). Es la forma de comprobar que el token es válido y la base sobre la que se
protegerán todas las operaciones de las fases siguientes.

**Why this priority**: valida de punta a punta el mecanismo de autenticación que exige la
constitución (Principio VI) antes de construir encima los grupos y gastos de la Fase 2. No
aporta valor nuevo al usuario final, por eso queda detrás de P1.

**Independent Test**: con un token obtenido al iniciar sesión, la consulta devuelve los datos
del usuario. Sin token, con un token alterado o con uno vencido, la consulta se rechaza como no
autenticada.

**Acceptance Scenarios**:

1. **Given** un token válido de Ana, **When** consulta su identidad, **Then** recibe su
   identificador, nombre y email.
2. **Given** que no se presenta ningún token, uno con la firma alterada o uno vencido, **When**
   se consulta la identidad, **Then** la solicitud se rechaza como no autenticada y no se
   devuelve ningún dato de usuario.

---

### User Story 4 - Modelo de datos completo persistido (Priority: P2)

El equipo de desarrollo cuenta con el almacenamiento persistente del modelo completo del
sistema: usuarios, grupos, miembros de grupo (incluidos invitados sin cuenta), categorías,
gastos individuales y liquidaciones con estado pagado o pendiente. Aunque en esta fase solo se
usan los usuarios, las demás entidades ya existen con sus relaciones y reglas de integridad, de
modo que la Fase 2 solo tenga que exponer operaciones sobre ellas.

**Why this priority**: es condición para la Fase 2 y para los entregables académicos (ERD y
diagrama de clases), pero el usuario final no lo percibe en esta fase.

**Independent Test**: con el servicio levantado desde cero, se cargan registros de prueba de
cada entidad directamente en el almacenamiento y se comprueba que se aceptan las combinaciones
válidas y se rechazan las que violan las reglas de integridad listadas en los requisitos.

**Acceptance Scenarios**:

1. **Given** un entorno recién inicializado, **When** se levanta el servicio, **Then** las seis
   entidades del modelo existen y están vacías, sin pasos manuales sobre la base de datos.
2. **Given** un grupo con un miembro registrado y un miembro invitado (sin cuenta, solo con
   alias), **When** se registra un gasto pagado por el invitado, **Then** el gasto se guarda
   asociado a ese miembro.
3. **Given** el modelo persistido, **When** se intenta guardar un gasto con monto negativo o
   cero, un miembro sin cuenta y sin alias, o una liquidación cuyo acreedor y deudor son el mismo
   miembro, **Then** el registro se rechaza.
4. **Given** que se guarda un gasto de 1234,56, **When** se lo vuelve a leer, **Then** el monto
   es exactamente 1234,56, sin errores de redondeo.

---

### User Story 5 - Entorno reproducible para el equipo (Priority: P3)

Cualquier integrante del equipo clona el repositorio, completa la configuración local a partir
de un archivo de ejemplo y levanta el servicio junto con su base de datos en un solo paso, sin
instalar ni configurar manualmente el motor de base de datos.

**Why this priority**: el equipo es de 2 o 3 personas y trabaja contra plazos académicos; un
entorno que cuesta levantar frena todas las fases siguientes. No es funcionalidad de usuario
final.

**Independent Test**: en una máquina sin la base de datos instalada, siguiendo solo las
instrucciones del repositorio, el servicio queda respondiendo al registro y al inicio de sesión.

**Acceptance Scenarios**:

1. **Given** un repositorio recién clonado, con la configuración local creada a partir del
   ejemplo, **When** se levanta el entorno, **Then** el servicio y la base de datos quedan
   disponibles y el modelo de datos queda aplicado.
2. **Given** el entorno detenido y vuelto a levantar, **When** se consulta una cuenta creada
   antes, **Then** la cuenta sigue existiendo (los datos sobreviven a los reinicios).

---

### Edge Cases

- **Registros simultáneos con el mismo email**: dos solicitudes de registro concurrentes con el
  mismo email producen exactamente una cuenta; la otra se rechaza como email en uso.
- **Variantes del mismo email**: `Ana@Ejemplo.com`, `ana@ejemplo.com` y ` ana@ejemplo.com ` se
  tratan como el mismo email (sin distinguir mayúsculas y sin espacios alrededor).
- **Contraseñas con espacios o caracteres no ASCII**: se aceptan tal cual se escriben; la
  contraseña no se recorta ni se normaliza.
- **Contraseña muy larga**: se rechazan las contraseñas de más de 72 bytes con un mensaje claro,
  en lugar de aceptarlas y comparar solo una parte.
- **Cuerpo de la solicitud vacío o mal formado**: se rechaza con un error de validación, sin
  errores internos ni detalles técnicos en la respuesta.
- **Campos desconocidos en la solicitud** (p. ej. un intento de fijar el identificador o el
  hash de contraseña): se ignoran y no afectan la cuenta creada.
- **Token emitido con una configuración de firma anterior**: si cambia el secreto de firma, los
  tokens emitidos antes dejan de ser válidos y se rechazan como no autenticados.
- **Propietario que no es miembro**: si se intenta registrar un gasto pagado por el propietario
  de un grupo o una liquidación que lo incluye sin que sea miembro de ese grupo, el registro se
  rechaza.
- **Base de datos no disponible**: el registro y el inicio de sesión devuelven un error de
  servicio no disponible, con un mensaje genérico y sin exponer detalles internos; no se crean
  registros a medias.

## Requirements *(mandatory)*

### Functional Requirements

**Registro**

- **FR-001**: El sistema DEBE permitir crear una cuenta a partir de nombre, email y contraseña.
- **FR-002**: El sistema DEBE normalizar el email (recortar espacios y pasarlo a minúsculas)
  antes de validarlo, guardarlo o compararlo.
- **FR-003**: El sistema DEBE rechazar un registro cuyo email normalizado ya pertenezca a otra
  cuenta, incluso cuando las solicitudes llegan al mismo tiempo, con el mensaje explícito "Ese
  email ya está registrado".
- **FR-004**: El sistema DEBE validar que el nombre tenga entre 1 y 100 caracteres después de
  recortar los espacios, que el email tenga un formato válido y que la contraseña tenga como
  mínimo 8 caracteres (contados como caracteres Unicode, no como bytes) y como máximo 72 bytes
  en UTF-8.
- **FR-005**: El sistema NUNCA DEBE guardar, registrar en logs ni devolver la contraseña en texto
  plano; solo DEBE guardar un hash irreversible con sal.
- **FR-006**: Si el registro es exitoso, el sistema DEBE devolver los datos públicos del usuario
  (identificador, nombre, email) y un token de acceso, igual que en un inicio de sesión.

**Inicio de sesión y tokens**

- **FR-007**: El sistema DEBE permitir iniciar sesión con email y contraseña y, si las
  credenciales son correctas, devolver un token de acceso firmado y los datos públicos del
  usuario.
- **FR-008**: Ante credenciales incorrectas, el sistema DEBE devolver el mismo mensaje y el
  mismo tipo de error, sin importar si el email existe o no.
- **FR-009**: Los tokens de acceso DEBEN identificar al usuario, vencer 7 días después de
  emitidos y poder verificarse sin guardar sesiones del lado del servidor.
- **FR-010**: El sistema DEBE ofrecer una consulta de la identidad propia que, con un token
  válido, devuelva los datos públicos del usuario y, sin token o con un token inválido, alterado
  o vencido, la rechace como no autenticada.
- **FR-011**: El mecanismo de verificación de tokens DEBE ser reutilizable, para que las
  operaciones de fases posteriores exijan autenticación sin reimplementarlo.

**Validación y errores**

- **FR-012**: Toda entrada DEBE validarse antes de procesarse. Los errores de validación DEBEN
  indicar el campo y el motivo, en castellano.
- **FR-013**: Las respuestas de error NO DEBEN exponer trazas, consultas ni detalles internos
  del sistema.
- **FR-014**: Los campos que el cliente no puede fijar (identificador, hash de contraseña,
  fechas de auditoría) DEBEN ignorarse si vienen en la solicitud.

**Modelo de datos persistido**

- **FR-015**: El sistema DEBE guardar de forma persistente las seis entidades del modelo
  (Usuario, Grupo, Miembro de grupo, Categoría, Gasto, Liquidación), con sus relaciones.
- **FR-016**: Un Miembro de grupo DEBE poder existir sin cuenta de usuario asociada, siempre que
  tenga un alias. Un mismo usuario NO DEBE figurar dos veces como miembro del mismo grupo.
- **FR-017**: Los montos de Gasto y Liquidación DEBEN guardarse con precisión decimal exacta de
  2 decimales (nunca como número de punto flotante). El monto de un Gasto DEBE ser mayor que
  cero. Todos los montos del sistema se expresan en pesos argentinos (ARS); no se guarda la
  moneda de cada monto ni se admiten otras monedas.
- **FR-018**: Una Liquidación DEBE referir a un acreedor y un deudor que sean miembros distintos
  del mismo grupo, y DEBE registrar si está pagada o pendiente (por defecto, pendiente).
- **FR-019**: Un Gasto DEBE pertenecer a una Categoría y lo DEBE haber pagado un miembro del
  mismo grupo al que pertenece esa categoría.
- **FR-020**: Los nombres de categoría NO DEBEN repetirse dentro de un mismo grupo.
- **FR-021**: Cada Grupo DEBE tener un usuario propietario. Ser propietario y ser miembro son
  roles independientes: el modelo NO DEBE exigir que el propietario sea miembro de su grupo, y
  el propietario solo puede pagar gastos o aparecer en liquidaciones si además es miembro. El
  acceso a un grupo corresponde a sus miembros con cuenta y a su propietario (la Fase 2 aplica
  esta regla en los endpoints).
- **FR-022**: Todo cambio en la estructura del almacenamiento DEBE aplicarse mediante
  migraciones versionadas en el repositorio, nunca con modificaciones manuales.

**Entorno**

- **FR-023**: El servicio y su base de datos DEBEN poder levantarse juntos en un solo paso, y
  los datos DEBEN sobrevivir a los reinicios del entorno.
- **FR-024**: Los secretos (credenciales de base de datos, secreto de firma de tokens) DEBEN
  leerse de una configuración local excluida del control de versiones. El repositorio DEBE
  incluir un archivo de ejemplo con todas las claves requeridas y sin valores sensibles reales.
- **FR-025**: Si falta una configuración obligatoria, el servicio NO DEBE arrancar y DEBE
  indicar qué clave falta.

### Key Entities *(include if feature involves data)*

- **Usuario**: persona con cuenta en el sistema. Tiene nombre, email único (normalizado) y
  credencial protegida. Puede ser dueño de grupos y miembro de varios grupos.
- **Grupo**: conjunto de personas que comparten gastos (un viaje, una casa, un evento).
  Reemplaza a la "sesión implícita" de la app original. Tiene nombre y un usuario propietario,
  que lo administra y no necesita ser miembro.
- **Miembro de grupo**: participación de una persona en un grupo. Puede estar vinculada a un
  Usuario o ser un invitado sin cuenta identificado por un alias. Es quien paga gastos y quien
  figura como acreedor o deudor en las liquidaciones.
- **Categoría**: agrupador de gastos dentro de un grupo (p. ej. "Supermercado", "Nafta"). Su
  nombre es único dentro del grupo.
- **Gasto**: un pago individual dentro de una categoría. Tiene quién lo pagó (un miembro), el
  monto exacto, una descripción y una fecha. Reemplaza al "gasto agregado por persona" de la app
  original.
- **Liquidación**: deuda resultante del reparto entre dos miembros de un grupo (acreedor y
  deudor), con monto exacto y estado pagada o pendiente. En esta fase solo existe en el modelo;
  el cálculo que la genera llega en la Fase 2.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona nueva completa el registro con datos válidos en menos de 1 minuto y
  queda identificada sin un paso adicional de inicio de sesión.
- **SC-002**: El 100 % de los registros con un email ya usado (en cualquier combinación de
  mayúsculas y espacios) se rechaza, también bajo solicitudes simultáneas.
- **SC-003**: En ningún dato guardado, log ni respuesta aparece una contraseña en texto plano
  (verificado revisando el almacenamiento y los logs después de un set de pruebas).
- **SC-004**: El inicio de sesión responde en menos de 2 segundos en el 95 % de los intentos en
  el entorno de desarrollo.
- **SC-005**: El 100 % de los intentos con credenciales inválidas recibe una respuesta
  indistinguible, tenga o no cuenta el email.
- **SC-006**: El 100 % de las consultas con un token ausente, alterado o vencido se rechaza.
- **SC-007**: Un integrante del equipo que nunca levantó el proyecto deja el servicio operativo
  en menos de 15 minutos siguiendo solo la documentación del repositorio.
- **SC-008**: Cada regla de integridad del modelo (FR-016 a FR-021) tiene al menos un caso de
  prueba que demuestra que se rechaza el dato inválido.

## Assumptions

- **Política de contraseña**: el mínimo es de 8 caracteres (y el máximo, 72 bytes, por FR-004), sin exigir composición (mayúsculas,
  símbolos). Alcanza para la etapa académica y evita fricción; se puede endurecer después.
- **Vigencia del token**: 7 días (confirmado en Clarifications), sin renovación automática ni cierre de sesión del lado del
  servidor. Al ser tokens sin estado, "cerrar sesión" significa que el cliente descarta el token.
  La renovación y la revocación quedan fuera de alcance.
- **Registro con inicio de sesión automático**: el registro devuelve un token para que la
  persona no tenga que iniciar sesión justo después.
- **Email duplicado**: se informa de forma explícita que el email ya está en uso (confirmado en
  Clarifications). Se acepta que
  esto permite saber qué emails tienen cuenta, a cambio de una mejor experiencia; el inicio de
  sesión sí es genérico (FR-008).
- **Consulta de identidad propia**: confirmada en Clarifications. Es parte de la autenticación
  y solo devuelve los datos del propio usuario; no es CRUD de usuarios ni de grupos.
- **Sin verificación de email ni recuperación de contraseña** en esta fase.
- **Sin límite de intentos** (rate limiting) en el inicio de sesión en esta fase. Queda como
  mejora futura.
- **Sin borrado de entidades** en esta fase: no hay operaciones de eliminación expuestas, así
  que las reglas de borrado en cascada se definen en la Fase 2.
- **Ubicación del código existente**: la app React sigue en la raíz del repositorio (`src/`). La
  mudanza a la estructura de monorepo que pide la constitución queda fuera de esta feature,
  porque se excluyen los cambios en el frontend. El backend se agrega sin tocar la app actual.
- **Pruebas**: según la constitución (Principio III), se recomiendan pruebas de integración de
  los endpoints de autenticación, que serán obligatorias en la Fase 7. Las reglas de integridad
  del modelo se validan según SC-008.
- **Entregables académicos**: las fichas de casos de uso "Registrarse", "Iniciar sesión" y
  "Consultar identidad", y su lugar en el diagrama de casos de uso de la Plantilla 02, se derivan
  de las historias de esta especificación.
- **Fuera de alcance**: altas, consultas, modificaciones y bajas de grupos, miembros, categorías
  y gastos; el cálculo y la generación de liquidaciones; cualquier cambio en el frontend;
  Mercado Pago; el dashboard; la exportación; el despliegue a producción
  (TODO(DEPLOY_TARGET) de la constitución).
