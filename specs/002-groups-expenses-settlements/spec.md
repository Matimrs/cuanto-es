# Feature Specification: Grupos, gastos y liquidaciones en el servidor (Fase 2)

**Feature Branch**: `feature/002-groups-expenses-settlements` (sobre la Fase 1)

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Fase 2" — según el roadmap de `docs/CLAUDE.md` §6: altas, consultas,
modificaciones y bajas de grupos, miembros, categorías y gastos, y migración del cálculo de
reparto (`calculate()` / `distribute()`) al servidor, con liquidaciones persistidas que se pueden
marcar como pagadas.

## Clarifications

### Session 2026-10-07

- Q: ¿Quiénes participan del reparto de una categoría? → A: Los miembros que se eligen para cada
  categoría, como en la app actual; pueden no haber pagado nada y aun así les corresponde su
  parte.
- Q: ¿Qué pasa con las liquidaciones ya pagadas cuando cambian los gastos? → A: Se conservan como
  pagos realizados y el nuevo cálculo descuenta lo ya pagado.
- Q: ¿Quién puede crear, modificar y eliminar categorías y gastos? → A: Cualquier participante
  del grupo (dueño o miembro con cuenta) puede crearlos; solo el dueño del grupo o quien los creó
  puede modificarlos o eliminarlos.
- Q: ¿Quién puede marcar una liquidación como pagada, o volverla a pendiente? → A: Solo el deudor
  o el acreedor de esa liquidación (si tienen cuenta) o el dueño del grupo.
- Q: ¿Cuándo se recalculan las liquidaciones pendientes? → A: Solo cuando cambian gastos,
  participantes, miembros o pagos; consultarlas no modifica nada, y marcar una pendiente que ya
  fue reemplazada se rechaza pidiendo volver a consultarlas.
- Q: ¿Se puede registrar un pago parcial de una liquidación? → A: Sí: se indica el monto pagado
  (menor o igual al total); se guarda un pago por ese monto y el resto se recalcula como
  pendiente.
- Q: ¿Quién se hace cargo del centavo sobrante cuando un monto no se divide en centavos exactos?
  → A: Quien más pagó en la categoría lo absorbe (recibe un centavo menos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y administrar mis grupos (Priority: P1)

Una persona con cuenta crea un grupo para un viaje, una casa compartida o un evento, y le pone un
nombre. Ve la lista de los grupos en los que participa (los que creó y aquellos de los que es
miembro), entra a uno para ver su contenido, puede cambiarle el nombre y, si es la dueña, puede
eliminarlo. Nadie que no pertenezca al grupo puede verlo ni modificarlo.

**Why this priority**: el grupo reemplaza a la "sesión implícita" de la app original; sin grupos
no hay dónde registrar miembros, categorías ni gastos. Es la base de toda la fase.

**Independent Test**: con dos cuentas, la primera crea un grupo y lo ve en su lista; la segunda
no lo ve en su lista y, si intenta acceder a él directamente, el sistema responde como si no
existiera.

**Acceptance Scenarios**:

1. **Given** Ana con sesión iniciada, **When** crea el grupo "Viaje a Córdoba", **Then** el grupo
   queda creado con Ana como dueña y aparece en su lista de grupos.
2. **Given** que Ana es dueña de "Viaje a Córdoba" y Beto es miembro con cuenta de "Casa",
   **When** cada uno pide su lista de grupos, **Then** Ana ve solo "Viaje a Córdoba" y Beto ve
   solo "Casa".
3. **Given** el grupo de Ana, **When** Carla (que no es dueña ni miembro) intenta verlo,
   modificarlo o consultar sus categorías, gastos o liquidaciones, **Then** el sistema rechaza la
   solicitud sin revelar si el grupo existe.
4. **Given** el grupo de Ana con miembros, categorías y gastos, **When** Ana lo elimina, **Then**
   el grupo y todo su contenido dejan de existir y desaparece de la lista de todos sus miembros.
5. **Given** el grupo de Ana, **When** un miembro que no es dueño intenta eliminarlo, **Then** el
   sistema lo rechaza por falta de permisos.

---

### User Story 2 - Sumar miembros al grupo, con y sin cuenta (Priority: P1)

La dueña del grupo agrega a las personas que comparten los gastos. Si alguien ya tiene cuenta en
CuantoEs, lo agrega por su email y esa persona pasa a ver el grupo en su lista. Si no tiene
cuenta, lo agrega como invitado con un alias (como en la app actual). Puede corregir el alias de
un invitado y quitar a un miembro que todavía no participa en ningún gasto ni liquidación.

**Why this priority**: los miembros son quienes pagan gastos y quienes figuran en las
liquidaciones; sin ellos no hay reparto posible.

**Independent Test**: en un grupo recién creado se agregan un usuario registrado por email y un
invitado por alias; ambos aparecen en la lista de miembros y el usuario registrado ve el grupo en
su propia lista.

**Acceptance Scenarios**:

1. **Given** el grupo de Ana y una cuenta existente `beto@ejemplo.com`, **When** Ana agrega a ese
   email como miembro, **Then** Beto figura como miembro (con su nombre de cuenta) y ve el grupo
   en su lista.
2. **Given** el grupo de Ana, **When** agrega un invitado con alias "Dani", **Then** Dani figura
   como miembro sin cuenta.
3. **Given** que Beto ya es miembro, **When** Ana intenta agregarlo otra vez (con cualquier
   combinación de mayúsculas o espacios en el email), **Then** el sistema lo rechaza indicando
   que ya es miembro.
4. **Given** el grupo de Ana, **When** intenta agregar un email que no corresponde a ninguna
   cuenta, **Then** el sistema lo rechaza con un mensaje que sugiere agregarlo como invitado.
5. **Given** que Dani pagó un gasto del grupo, **When** Ana intenta quitarlo, **Then** el sistema
   lo rechaza indicando que primero hay que eliminar o reasignar sus gastos.
6. **Given** Ana, dueña del grupo pero no miembro, **When** se agrega a sí misma por su email,
   **Then** pasa a ser también miembro y puede pagar gastos.

---

### User Story 3 - Registrar categorías y gastos individuales (Priority: P1)

Dentro de un grupo, los participantes crean categorías ("Nafta", "Supermercado") y eligen qué
miembros participan del reparto de cada una (como en la app actual: quien no viajó en el auto no
participa de la nafta). Después registran cada gasto por separado: quién lo pagó, cuánto, una
descripción opcional y la fecha. Pueden ver los gastos de cada categoría y, si son el dueño del
grupo o quienes los cargaron, corregir o eliminar una categoría o un gasto. Así queda el
historial que la app original no tenía.

**Why this priority**: los gastos individuales son la materia prima del cálculo y el valor nuevo
del sistema frente a la app original (Principio VII).

**Independent Test**: en un grupo con dos miembros se crea la categoría "Nafta", se registran
dos gastos y se comprueba que la categoría muestra ambos con su total; luego se corrige el monto
de uno y se elimina el otro.

**Acceptance Scenarios**:

1. **Given** un grupo con los miembros Ana, Beto y Dani, **When** se crea la categoría "Nafta"
   con Ana y Dani como participantes, **Then** la categoría aparece en el grupo sin gastos y con
   esos dos participantes; Beto no participa de su reparto.
2. **Given** la categoría "Nafta", **When** se registra un gasto de 15.000,50 pagado por Dani con
   fecha 2026-10-05 y descripción "YPF ruta 9", **Then** el gasto queda guardado con esos datos
   exactos y figura en la lista de gastos de la categoría.
3. **Given** el grupo, **When** se intenta crear otra categoría llamada "nafta " (mismo nombre con
   otras mayúsculas o espacios), **Then** el sistema la rechaza por nombre repetido.
4. **Given** un gasto existente, **When** se modifica su monto, descripción, fecha, categoría o
   quién lo pagó, **Then** los cambios quedan guardados y se reflejan en el siguiente cálculo.
5. **Given** un gasto, **When** se intenta guardar con monto cero o negativo, con más de dos
   decimales, sin fecha o pagado por alguien que no participa de esa categoría, **Then** el
   sistema lo rechaza indicando el campo inválido.
6. **Given** la categoría "Nafta" con gastos, **When** el dueño del grupo o quien la creó la
   elimina, **Then** la categoría y sus gastos dejan de existir.
7. **Given** un gasto cargado por Dani, **When** Beto (miembro con cuenta, pero no dueño ni autor
   del gasto) intenta modificarlo o eliminarlo, **Then** el sistema lo rechaza por falta de
   permisos; Beto sí puede verlo y cargar sus propios gastos.
8. **Given** la categoría "Nafta" con Ana y Dani como participantes, **When** se suma a Beto como
   participante, **Then** Beto pasa a participar del reparto de esa categoría aunque no haya
   pagado nada; y si se intenta quitar a Dani, que pagó un gasto en ella, el sistema lo rechaza.

---

### User Story 4 - Ver quién le debe a quién, calculado por el sistema (Priority: P1)

Cualquier participante del grupo consulta las liquidaciones: la lista mínima de transferencias
(quién le paga a quién y cuánto) que deja a todos con un aporte equilibrado en cada categoría.
El resultado es el mismo que da hoy la app (mismo reparto, misma unificación de pagos entre las
mismas personas y misma eliminación de cadenas), pero calculado y guardado por el sistema.

**Why this priority**: es el propósito del producto. El cálculo oficial pasa al servidor
(Principio I) para que todos los participantes vean el mismo resultado.

**Independent Test**: se carga en un grupo un escenario de referencia cuyo resultado en la app
actual es conocido y se comprueba que las liquidaciones del sistema son las mismas transferencias
con los mismos montos (redondeados a centavos).

**Acceptance Scenarios**:

1. **Given** la categoría "Nafta" con participantes Ana (pagó 300), Beto (pagó 0) y Dani (pagó 0),
   **When** se consultan las liquidaciones, **Then** el resultado es: Beto le paga 100 a Ana y
   Dani le paga 100 a Ana.
2. **Given** dos categorías en las que Ana le debe a Beto en una y Beto le debe a Ana en la otra,
   **When** se consultan las liquidaciones, **Then** aparece una sola transferencia entre ambos
   por la diferencia (unificación de pagos).
3. **Given** un resultado con cadena (Ana le debe a Beto y Beto le debe a Carla), **When** se
   consultan las liquidaciones, **Then** el sistema la simplifica (Ana le paga directamente a
   Carla) sin cambiar cuánto debe o recibe cada uno en total.
4. **Given** una categoría con participantes Ana (pagó 100), Beto (0) y Dani (0), **When** se
   consultan las liquidaciones, **Then** Beto le paga 33,33 a Ana y Dani le paga 33,33 a Ana: Ana,
   que fue quien más pagó, absorbe el centavo sobrante (su parte es 33,34 y recibe 66,66). La suma
   de lo que se paga es igual a la suma de lo que se recibe, sin deudas residuales.
5. **Given** un grupo cuyas cuentas ya están equilibradas (o sin gastos), **When** se consultan
   las liquidaciones, **Then** la lista está vacía.
6. **Given** liquidaciones pendientes ya calculadas, **When** se agrega, modifica o elimina un
   gasto, **Then** las pendientes se recalculan y la próxima consulta refleja el cambio. Si no
   cambió nada, dos consultas seguidas devuelven exactamente las mismas liquidaciones (con los
   mismos identificadores).
7. **Given** que Beto ya pagó la liquidación "Beto le paga 100 a Ana" (marcada como pagada),
   **When** se agrega un gasto que hace que Beto deba 150 en total, **Then** la liquidación pagada
   se conserva tal cual y aparece una nueva pendiente por los 50 que faltan.
8. **Given** que Beto pagó 100 a Ana, **When** se elimina un gasto y ahora Beto solo debía 60,
   **Then** la liquidación pagada se conserva y Beto tiene 40 a cobrar: si Ana y Beto son los
   únicos con saldo, aparece "Ana le devuelve 40 a Beto"; si hay otros deudores de Ana, la
   simplificación de cadenas puede hacer que esos 40 se los pague otro deudor directamente a
   Beto. En ambos casos ningún saldo neto cambia.

---

### User Story 5 - Marcar una liquidación como pagada (Priority: P2)

Cuando alguien transfiere lo que debe, total o parcialmente, se registra ese pago sobre la
liquidación; si se registró por error, se puede volver a pendiente. Así el grupo sabe qué deudas
siguen abiertas y por cuánto.

**Why this priority**: agrega el estado de pago que la app original no tenía y prepara la
integración con Mercado Pago (Fase 5), pero el reparto ya es útil sin él.

**Independent Test**: con una liquidación pendiente, se la marca como pagada y la siguiente
consulta la muestra pagada; se la vuelve a pendiente y se muestra pendiente.

**Acceptance Scenarios**:

1. **Given** la liquidación pendiente "Beto le paga 100 a Ana", **When** Beto (deudor), Ana
   (acreedora) o el dueño del grupo la marca como pagada, **Then** queda pagada y se registra
   cuándo se marcó y quién la marcó.
2. **Given** una liquidación pagada, **When** se la vuelve a marcar como pendiente, **Then** deja
   de contar como pago realizado y las pendientes se recalculan en ese momento.
3. **Given** una liquidación de un grupo al que Carla no pertenece, **When** Carla intenta
   marcarla, **Then** el sistema rechaza la solicitud sin revelar si la liquidación existe.
4. **Given** la liquidación "Beto le paga 100 a Ana" y Carla, miembro con cuenta del grupo que no
   es deudora, acreedora ni dueña, **When** Carla intenta marcarla como pagada o volverla a
   pendiente, **Then** el sistema lo rechaza por falta de permisos (Carla sí puede verla).
5. **Given** la liquidación "Dani le paga 50 a Ana", donde Dani es un invitado sin cuenta, **When**
   Ana o el dueño la marcan como pagada, **Then** queda pagada.
6. **Given** que Beto consultó la pendiente "Beto le paga 100 a Ana" y después alguien agregó un
   gasto que la reemplazó, **When** Beto intenta marcar la liquidación que había consultado,
   **Then** el sistema lo rechaza indicando que las liquidaciones cambiaron y hay que volver a
   consultarlas.
7. **Given** la pendiente "Beto le paga 100 a Ana", **When** Beto registra un pago de 60,
   **Then** queda un pago realizado de 60 de Beto a Ana y una nueva pendiente "Beto le paga 40 a
   Ana".
8. **Given** la pendiente "Beto le paga 100 a Ana", **When** se intenta registrar un pago de 120,
   de 0 o con más de dos decimales, **Then** el sistema lo rechaza indicando el monto válido.
9. **Given** el pago parcial de 60 del escenario 7, **When** se lo vuelve a pendiente, **Then** el
   pago de 60 deja de contar y las pendientes se recalculan: vuelve a quedar "Beto le paga 100 a
   Ana".

---

### Edge Cases

- **Categoría sin gastos o con un solo participante**: no genera transferencias.
- **Categoría sin participantes**: no se permite; toda categoría tiene al menos un participante.
- **Miembro agregado al grupo después de crear una categoría**: no se suma solo a las categorías
  existentes; hay que agregarlo como participante de cada una.
- **Pagos que superan lo que se debía** (porque después cambiaron los gastos): la diferencia
  aparece como una liquidación pendiente en sentido inverso.
- **Todos los participantes pagaron lo mismo**: no genera transferencias.
- **Montos que no se dividen en centavos exactos** (p. ej. 100 entre 3): la parte de cada
  participante se redondea hacia abajo al centavo y los centavos sobrantes los absorbe quien más
  pagó en la categoría (su parte aumenta y recibe esos centavos menos). Si hay empate entre
  quienes más pagaron, los absorbe el que se sumó primero a la categoría.
- **Un miembro que participa en varias categorías**: sus saldos se combinan entre categorías
  antes de generar las transferencias.
- **Invitados sin cuenta**: participan del reparto igual que los miembros con cuenta.
- **El dueño que no es miembro**: puede administrar el grupo, pero no figura en el reparto ni en
  las liquidaciones salvo que se agregue a sí mismo como miembro.
- **Quitar un miembro con gastos o liquidaciones pagadas**: se rechaza; primero hay que eliminar
  o reasignar sus gastos. Si solo era participante de categorías (sin gastos ni pagos), al
  quitarlo deja de participar de ellas.
- **Alias repetido**: no se permiten dos invitados con el mismo alias (sin distinguir mayúsculas
  ni espacios) dentro del mismo grupo, para que el reparto no sea ambiguo.
- **Cambiar la categoría de un gasto a otra de otro grupo, o el pagador a un miembro de otro
  grupo**: se rechaza.
- **Recursos de otro grupo**: pedir una categoría, gasto, miembro o liquidación por su
  identificador cuando no pertenece a un grupo al que el usuario tiene acceso se responde como
  "no encontrado", sin revelar que existe.
- **Cuenta eliminada o token vencido** a mitad de una operación: se rechaza como no autenticada
  (comportamiento de la Fase 1).
- **Dos personas editan el mismo gasto a la vez**: queda guardada la última modificación.
- **Marcar una liquidación que dejó de existir** (porque un cambio la reemplazó entre la consulta
  y el marcado): se rechaza pidiendo volver a consultar las liquidaciones.
- **Montos muy grandes**: se aceptan hasta 9.999.999.999,99; los mayores se rechazan.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: Todas las operaciones de esta fase DEBEN exigir una sesión iniciada (token válido
  de la Fase 1).
- **FR-002**: Solo el dueño de un grupo y sus miembros con cuenta DEBEN poder ver un grupo y
  operar sobre sus miembros, categorías, gastos y liquidaciones. Para cualquier otro usuario, el
  grupo y todos sus recursos DEBEN responder como inexistentes.
- **FR-003**: Solo el dueño DEBE poder renombrar o eliminar el grupo, agregar o quitar miembros y
  modificar el alias de un invitado.
- **FR-003a**: Cualquier participante del grupo (dueño o miembro con cuenta) DEBE poder crear
  categorías y registrar gastos. Solo el dueño del grupo o el usuario que creó una categoría o un
  gasto DEBE poder modificarlo o eliminarlo; para los demás participantes la operación DEBE
  rechazarse por falta de permisos. El sistema DEBE registrar qué usuario creó cada categoría y
  cada gasto.

**Grupos**

- **FR-004**: Un usuario DEBE poder crear un grupo con un nombre de 1 a 100 caracteres (después
  de recortar espacios); queda registrado como su dueño.
- **FR-005**: Un usuario DEBE poder listar los grupos de los que es dueño o miembro con cuenta,
  con nombre, dueño, cantidad de miembros y fecha de creación.
- **FR-006**: El detalle de un grupo DEBE incluir su nombre, su dueño, sus miembros y sus
  categorías con el total gastado en cada una.
- **FR-007**: El dueño DEBE poder cambiar el nombre del grupo y eliminarlo; al eliminarlo DEBEN
  eliminarse también sus miembros, categorías, gastos y liquidaciones.

**Miembros**

- **FR-008**: El dueño DEBE poder agregar como miembro a un usuario registrado indicando su email
  (normalizado como en la Fase 1). Si el email no corresponde a ninguna cuenta, la operación DEBE
  rechazarse con un mensaje que sugiera agregarlo como invitado.
- **FR-009**: El dueño DEBE poder agregar un invitado sin cuenta indicando un alias de 1 a 100
  caracteres; el alias NO DEBE repetirse entre los invitados del grupo (sin distinguir mayúsculas
  ni espacios alrededor).
- **FR-010**: Un mismo usuario NO DEBE figurar dos veces como miembro del mismo grupo. El dueño
  PUEDE agregarse a sí mismo como miembro.
- **FR-011**: El nombre visible de un miembro DEBE ser el nombre de su cuenta si la tiene, o su
  alias si es invitado.
- **FR-012**: El dueño DEBE poder quitar a un miembro solo si no pagó ningún gasto ni figura en
  ninguna liquidación pagada; en caso contrario la operación DEBE rechazarse indicando el motivo.
  Al quitarlo, deja de participar de las categorías en las que figuraba.

**Categorías**

- **FR-013**: Se DEBE poder crear, renombrar y eliminar categorías dentro de un grupo (con los
  permisos de FR-003a). El nombre tiene de 1 a 100 caracteres y NO DEBE repetirse dentro del
  grupo (sin distinguir mayúsculas ni espacios alrededor).
- **FR-014**: Al eliminar una categoría DEBEN eliminarse también sus gastos y su lista de
  participantes.
- **FR-015**: Cada categoría DEBE tener una lista de participantes del reparto, elegidos entre
  los miembros del grupo (con o sin cuenta), con al menos un participante. Al crear la categoría
  se indican sus participantes; si no se indican, participan todos los miembros que el grupo
  tiene en ese momento.
- **FR-015a**: Se DEBE poder agregar o quitar participantes de una categoría (con los permisos de
  FR-003a). Un participante que pagó algún gasto en esa categoría NO DEBE poder quitarse.
- **FR-015b**: Un participante sin gastos en una categoría DEBE contar en su reparto como un
  aporte de cero: le corresponde su parte del promedio.

**Gastos**

- **FR-016**: Se DEBE poder registrar un gasto indicando la categoría, el miembro que lo pagó,
  el monto, la fecha y, opcionalmente, una descripción de hasta 200 caracteres.
- **FR-017**: El monto de un gasto DEBE ser mayor que cero, tener como máximo dos decimales y no
  superar 9.999.999.999,99 (ARS). Los montos con más decimales DEBEN rechazarse, no redondearse.
- **FR-018**: La categoría y el miembro que pagó DEBEN pertenecer al mismo grupo, y el miembro que
  pagó DEBE ser participante de esa categoría.
- **FR-019**: Se DEBE poder listar los gastos de una categoría, ordenados por fecha (más reciente
  primero), con quién pagó, monto, descripción y fecha.
- **FR-020**: Se DEBE poder modificar cualquier dato de un gasto (respetando FR-017, FR-018 y los
  permisos de FR-003a) y eliminarlo.

**Cálculo de liquidaciones**

- **FR-021**: El sistema DEBE calcular las liquidaciones de un grupo a partir de sus gastos
  individuales: para cada categoría, el aporte equitativo es el promedio de lo pagado por sus
  participantes (sumando los gastos de cada uno); luego se unifican los pagos entre las mismas dos
  personas y se eliminan las cadenas, igual que la app actual.
- **FR-022**: Para un grupo sin liquidaciones pagadas, el resultado DEBE ser el mismo que el de la
  app actual con las mismas entradas: las mismas transferencias entre las mismas personas, con
  los montos redondeados a centavos.
- **FR-023**: El cálculo DEBE conservar el saldo neto de cada miembro: lo que cada uno paga o
  recibe en total (sumando liquidaciones pendientes y pagadas) DEBE ser exactamente igual a la
  diferencia entre lo que aportó y su parte, donde la parte de cada categoría es la que define
  FR-024a. La parte puede diferir del promedio exacto solo por el redondeo a centavos de FR-024a.
- **FR-024**: Los montos de las liquidaciones DEBEN estar redondeados a centavos; la suma de lo
  que se paga DEBE ser exactamente igual a la suma de lo que se recibe y NO DEBEN aparecer
  transferencias de menos de un centavo.
- **FR-024a**: En cada categoría, la parte de cada participante DEBE ser el total dividido por la
  cantidad de participantes, redondeado hacia abajo al centavo. Los centavos que falten para
  llegar al total DEBEN sumarse a la parte de quien más pagó en esa categoría (con empate, al
  que se sumó primero a la categoría).
- **FR-025**: El cálculo DEBE ser determinista: las mismas entradas DEBEN producir siempre las
  mismas transferencias, en el mismo orden.
- **FR-026**: El cálculo oficial DEBE hacerse en el sistema (no en el cliente) y sus resultados
  DEBEN guardarse como liquidaciones del grupo.
- **FR-027**: Las liquidaciones pendientes DEBEN recalcularse cada vez que cambia algo que las
  afecta (alta, modificación o baja de gastos; cambios en los participantes de una categoría;
  baja de categorías o miembros; marcar o desmarcar un pago), y solo entonces; las pendientes
  anteriores se reemplazan por el nuevo cálculo. Consultar las liquidaciones NO DEBE modificarlas:
  mientras no cambie nada, las pendientes conservan sus identificadores y montos.
- **FR-027c**: Marcar como pagada una liquidación pendiente que ya fue reemplazada por un recálculo
  DEBE rechazarse con un mensaje que indique que las liquidaciones cambiaron y hay que volver a
  consultarlas.
- **FR-027a**: Las liquidaciones pagadas DEBEN conservarse sin cambios como pagos realizados. El
  cálculo de las pendientes DEBE descontar lo ya pagado: cada pago reduce la deuda del deudor y
  lo que le corresponde recibir al acreedor. Si lo pagado supera lo que se debía, la diferencia
  DEBE aparecer como una liquidación pendiente en sentido inverso.
- **FR-027b**: La consulta de liquidaciones DEBE devolver por separado las pendientes y las
  pagadas, y el saldo neto de cada miembro (lo que aportó, lo que le corresponde aportar, lo que
  ya pagó o recibió y lo que le falta).

**Estado de pago**

- **FR-028**: Solo el deudor o el acreedor de una liquidación (si son miembros con cuenta) o el
  dueño del grupo DEBEN poder registrar un pago sobre ella o volver un pago a pendiente; para
  cualquier otro participante la operación DEBE rechazarse por falta de permisos. El sistema DEBE
  registrar cuándo y qué usuario registró cada pago. Al volver un pago a pendiente, deja de
  contar como pago realizado y las pendientes se recalculan (FR-027).
- **FR-028a**: Al registrar un pago sobre una liquidación pendiente se PUEDE indicar el monto
  pagado; si no se indica, es el monto completo. El monto DEBE ser mayor que cero, tener como
  máximo dos decimales y no superar el de la liquidación. El pago queda guardado como una
  liquidación pagada por ese monto (mismo deudor y acreedor) y, si fue parcial, lo que falta se
  recalcula como pendiente (FR-027a).

**Validación y errores** (continúan las reglas de la Fase 1)

- **FR-029**: Toda entrada DEBE validarse antes de procesarse; los errores DEBEN indicar el campo y
  el motivo en castellano, sin exponer detalles internos, y los campos que el cliente no puede
  fijar (identificadores, dueño, fechas de auditoría) DEBEN ignorarse.
- **FR-030**: Las operaciones de eliminación DEBEN ser explícitas (una solicitud por recurso) y
  sus efectos DEBEN verse de inmediato en el siguiente cálculo.

### Key Entities *(include if feature involves data)*

- **Grupo**: conjunto de personas que comparten gastos. Tiene nombre y un dueño, que lo
  administra y no necesita ser miembro.
- **Miembro de grupo**: participación de una persona en un grupo, con cuenta (usuario) o como
  invitado con alias. Paga gastos y figura en las liquidaciones.
- **Categoría**: agrupador de gastos dentro de un grupo, con nombre único en el grupo, el usuario
  que la creó y su lista de participantes del reparto.
- **Participante de categoría** (nuevo respecto de la Fase 1): vínculo entre una categoría y un
  miembro del mismo grupo que participa de su reparto, haya pagado o no.
- **Gasto**: pago individual dentro de una categoría: quién pagó (un participante), monto,
  descripción, fecha y el usuario que lo cargó.
- **Liquidación**: transferencia entre dos miembros (deudor → acreedor), con monto, estado
  pagada/pendiente, fecha en que se marcó como pagada y usuario que la marcó. Un pago parcial se
  guarda como una liquidación pagada por el monto abonado. Las pagadas son el historial de pagos
  realizados; las pendientes son el resultado del último cálculo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para un conjunto de al menos 10 escenarios de referencia (incluidos un solo
  participante, gastos iguales, montos que no dividen en centavos, miembros en varias categorías,
  invitados sin cuenta y cadenas de deuda), el 100 % de los resultados del sistema coincide con
  el de la app actual, redondeado a centavos.
- **SC-002**: En el 100 % de los cálculos, la suma de lo que se paga es igual a la suma de lo que
  se recibe y cada miembro queda exactamente con su saldo neto (lo aportado menos su parte según
  FR-024a), contando los pagos ya realizados, sin diferencias residuales.
- **SC-007**: En el 100 % de los escenarios con liquidaciones pagadas, después de cualquier cambio
  en los gastos, las pagadas se conservan sin cambios y la suma de pagadas más pendientes deja a
  cada miembro con su saldo neto exactamente equilibrado (FR-023).
- **SC-003**: Calcular las liquidaciones de un grupo de hasta 20 miembros, 10 categorías y 500
  gastos tarda menos de 2 segundos en el 95 % de las consultas en el entorno de desarrollo.
- **SC-004**: El 100 % de los intentos de ver o modificar un grupo o sus recursos por parte de
  un usuario sin acceso se rechaza, sin revelar si el recurso existe.
- **SC-005**: Una persona puede armar un grupo de ejemplo (crear el grupo, agregar 3 miembros,
  2 categorías y 5 gastos) y obtener sus liquidaciones en menos de 5 minutos usando solo la
  documentación de la API.
- **SC-006**: Cada regla de validación y de permisos de esta especificación tiene al menos un
  caso de prueba que demuestra el rechazo del dato o de la operación inválida.

## Assumptions

- **Sin cambios en el frontend**: la app React sigue funcionando en memoria. Consumir esta API es
  la Fase 3 del roadmap. Esta fase entrega solo operaciones del servidor y su documentación.
- **Moneda**: todos los montos están en ARS (decisión de la Fase 1).
- **Algoritmo**: el reparto, la unificación de pagos y la eliminación de cadenas de la app actual
  se reutilizan sin cambiar el algoritmo (Principio I); solo se adapta la entrada (los gastos
  individuales agrupados por categoría y por miembro) y se agrega el redondeo a centavos.
- **Cambios en el modelo de la Fase 1**: hacen falta la lista de participantes por categoría, el
  usuario que creó cada categoría y cada gasto, y la fecha en que se marcó como pagada cada
  liquidación. Se agregan con migraciones versionadas (Principio VII); las reglas de borrado en
  cascada que la Fase 1 dejó pendientes se definen acá (grupo → todo su contenido; categoría →
  gastos y participantes).
- **Pagos y algoritmo**: para descontar lo ya pagado no se cambia el algoritmo de reparto; los
  pagos realizados se incorporan como datos de entrada del cálculo.
- **Agregar miembros**: un usuario registrado se suma por email, sin invitación ni aceptación de
  su parte; los enlaces para unirse quedan para fases posteriores.
- **Vincular un invitado con una cuenta** (convertir a "Dani" invitado en un usuario registrado
  conservando sus gastos) queda fuera de esta fase.
- **Fechas de gasto**: se aceptan fechas pasadas y futuras; no hay restricción de rango más allá
  de que sea una fecha válida.
- **Concurrencia**: ante dos modificaciones simultáneas del mismo recurso queda la última; no hay
  bloqueo optimista en esta fase.
- **Paginación**: a escala académica (decenas de grupos, cientos de gastos) las listas se
  devuelven completas.
- **Entregables académicos**: los nuevos casos de uso ("Crear grupo", "Agregar miembro",
  "Registrar gasto", "Calcular liquidaciones", "Marcar liquidación pagada", etc.) se suman al
  diagrama y a las fichas de la Plantilla 02, y sus casos al plan de pruebas formal.
- **Fuera de alcance**: cambios en el frontend, dashboard (Fase 4), Mercado Pago (Fase 5),
  exportación y enlaces para compartir (Fase 6), notificaciones, transferir la propiedad de un
  grupo y salir de un grupo por cuenta propia.
