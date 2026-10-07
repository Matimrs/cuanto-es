# Plan de pruebas: autenticación (Fase 1)

Casos de prueba derivados de los casos de uso de [casos-de-uso.md](casos-de-uso.md) (Unidad 6).
Es un artefacto distinto de los tests automatizados y no los reemplaza (Principio III de la
constitución): cada caso indica qué test lo respalda o, si es manual, qué paso de
`specs/001-backend-auth-base/quickstart.md` seguir.

**Entorno**: `docker compose up --build` con `server/.env` creado desde `server/.env.example`.
Tests automatizados: `cd server && npm test` (base `cuantoes_test`).

## CU-01 Registrarse

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-01 | Principal | No existe `ana@ejemplo.com` | `Ana`, ` ANA@Ejemplo.com `, `secreta123` | 201; `user` con id, `Ana` y `ana@ejemplo.com`; token; ningún campo de contraseña. En la base, hash que empieza con `$2` | `auth.register` › escenario 1 |
| CP-02 | 4a | Existe `ana@ejemplo.com` | Mismo email como `ANA@Ejemplo.com ` | 409 `EMAIL_TAKEN` "Ese email ya está registrado"; sigue habiendo una cuenta | `auth.register` › escenario 2 |
| CP-03 | 4a | No existe la cuenta | Dos registros simultáneos con el mismo email | Uno 201 y otro 409; una sola cuenta | `auth.register` › registros simultáneos |
| CP-04 | 3a | — | Email `ana-sin-arroba` | 400 `VALIDATION_ERROR` con `fields.email` | `auth.register` › escenario 3 |
| CP-05 | 3a | — | Sin nombre | 400 con `fields.name` | `auth.register` › escenario 3 |
| CP-06 | 3a | — | Contraseña `corta` | 400 con `fields.password` "La contraseña debe tener al menos 8 caracteres" | `auth.register` › escenario 3 |
| CP-07 | 3a | — | Contraseña de 25 `€` (75 bytes) | 400 con `fields.password` | `auth.register` › 72 bytes; `schemas` |
| CP-08 | Principal | — | Contraseña con espacios y `ñ` | Se acepta tal cual, sin recortar | `schemas` › no recorta |
| CP-09 | 3b | — | Cuerpo vacío; JSON mal formado | 400 `VALIDATION_ERROR` sin trazas | `auth.register` › cuerpo vacío / JSON mal formado |
| CP-10 | Reglas | — | Cuerpo con `id` y `passwordHash` falsos | 201; se ignoran ambos campos | `auth.register` › ignora campos |
| CP-11 | 4b | Base caída | Registro válido | 503 `SERVICE_UNAVAILABLE`, sin detalles internos | `errors` › 503 |
| CP-12 | Principal | — | Registro que falla con error interno | Ninguna contraseña en los logs (SC-003) | `errors` › SC-003; manual: quickstart §3 "Contraseña nunca en claro" |

## CU-02 Iniciar sesión

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-13 | Principal | Existe la cuenta de Ana | `  ANA@Ejemplo.com `, `secreta123` | 200 con `user` y un token cuyo `sub` es el id de Ana | `auth.login` › escenario 1 |
| CP-14 | 3a | Existe la cuenta de Ana | Contraseña `otra-clave` | 401 `INVALID_CREDENTIALS` "Email o contraseña incorrectos" | `auth.login` › escenarios 2 y 3 |
| CP-15 | 3a | No existe `nadie@ejemplo.com` | `nadie@ejemplo.com`, `secreta123` | 401 con un cuerpo idéntico al de CP-14 (SC-005) | `auth.login` › escenarios 2 y 3 |
| CP-16 | 3a | Existe la cuenta de Ana | Contraseña `corta` | 401, no 400 (no revela la política) | `auth.login` › contraseña corta |
| CP-17 | 1a | — | Email inválido, sin contraseña | 400 con `fields.email` y `fields.password` | `auth.login` › cuerpo inválido |
| CP-18 | 3b | Base caída | Login válido | 503 o 500 sin detalles internos | `errors` › 500 |
| CP-19 | Principal | Entorno con `BCRYPT_ROUNDS=12` | 20 logins seguidos | p95 < 2 s (SC-004) | Manual: `node scripts/login-p95.js` (quickstart §5) |

## CU-03 Consultar identidad

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-20 | Principal | Token de Ana obtenido en el login | `Authorization: Bearer <token>` | 200 `{ user: { id, name, email } }` sin hash | `auth.me` › escenario 1; login |
| CP-21 | 1a | — | Sin header `Authorization` | 401 `UNAUTHENTICATED` "Necesitás iniciar sesión" | `auth.me` › escenario 2 |
| CP-22 | 2a | Token de Ana | Un carácter de la firma cambiado | 401 sin datos de usuario | `auth.me` › firma alterada; `crypto` |
| CP-23 | 2a | — | Token vencido | 401 | `auth.me` › vencido; `crypto` |
| CP-24 | 2a | — | Token firmado con otro secreto (o sin firma) | 401 | `auth.me` › otro secreto; `crypto` › alg none |
| CP-25 | 2a | Token emitido y cuenta borrada después | Token de la cuenta borrada | 401 | `auth.me` › usuario que ya no existe |

## Entorno y configuración (US5)

| ID | Caso | Resultado esperado | Respaldo |
|---|---|---|---|
| CP-26 | Levantar desde un clon limpio siguiendo solo el README | Servicio respondiendo a registro y login en menos de 15 minutos (SC-007) | Manual: T044, lo ejecuta un integrante nuevo en el entorno |
| CP-27 | Reiniciar el entorno sin borrar el volumen | La cuenta creada antes sigue existiendo | Manual: quickstart §3 "Persistencia" |
| CP-28 | Arrancar sin `JWT_SECRET` | El servicio no arranca y el mensaje nombra `JWT_SECRET` (FR-025) | `config` (unit); manual: quickstart §3 |

Las reglas de integridad del modelo (FR-015 a FR-021, SC-008) no son casos de uso del actor:
se prueban en `server/tests/integration/model.integrity.test.js`.

---

# Fase 2: grupos, gastos y liquidaciones

Casos derivados de CU-04 a CU-09 ([casos-de-uso.md](casos-de-uso.md)) y de
`specs/002-groups-expenses-settlements/spec.md`.

- **Entorno:** el mismo de la Fase 1.
- **Datos de partida de cada caso automatizado:** los arma `server/tests/setup/factories.js`.
- **Recorrido manual:** `specs/002-groups-expenses-settlements/quickstart.md` §2.

## CU-04 Crear y administrar grupo

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-29 | Principal | Ana con sesión | `name: "  Viaje a Córdoba  "` | 201; nombre recortado; Ana dueña (`role: owner`) | `groups` › US1-1 |
| CP-30 | 2a | — | Nombre vacío o de 101 caracteres | 400 con `fields.name` | `groups` › nombre |
| CP-31 | A1 | Ana dueña de "Viaje"; Beto miembro de "Casa" | `GET /groups` de cada uno | Cada uno ve solo su grupo, del más reciente al más antiguo | `groups` › US1-2 |
| CP-32 | A2 | Grupo con miembros, gastos y pagos | La dueña elimina el grupo | 204; desaparece de todas las listas con todo su contenido | `groups` › US1-4 |
| CP-33 | A2 | Beto miembro, no dueño | Beto renombra o elimina | 403 `FORBIDDEN` | `groups` › US1-5 |
| CP-34 | A3 | Carla sin acceso | GET, PATCH o DELETE del grupo; id que no es UUID | 404 en todos los casos, nunca 500 | `groups` › US1-3 |

## CU-05 Agregar o quitar miembro

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-35 | Principal | Existe la cuenta de Beto | `email: " BETO@Ejemplo.com "` | 201; Beto pasa a tener acceso al grupo | `members` › US2-1 |
| CP-36 | Principal | — | `alias: "  Dani "` | 201; invitado `Dani` sin cuenta | `members` › US2-2 |
| CP-37 | 3a | No existe la cuenta | `email: nadie@ejemplo.com` | 422 `USER_NOT_FOUND`, sugiere invitado | `members` › US2-4 |
| CP-38 | 3b | Beto ya es miembro / existe el invitado "Dani" | Mismo email / alias `" DANI"` | 409 `ALREADY_MEMBER` / `ALIAS_TAKEN` | `members` › US2-3, FR-009 |
| CP-39 | 2a | — | Email y alias a la vez, o ninguno | 400 | `members` › validación |
| CP-40 | A2 | Dani pagó un gasto / tiene un pago | Quitar a Dani | 409 `MEMBER_HAS_EXPENSES` / `MEMBER_HAS_PAYMENTS` | `members` › US2-5 |
| CP-41 | A2 | Dani sin gastos ni pagos | Quitar a Dani | 204; deja sus categorías; se recalculan las pendientes | `members` › quitar |
| CP-42 | A3 | Beto miembro, no dueño | Agregar, cambiar alias o quitar | 403 | `members` › permisos |

## CU-06 Gestionar categoría y participantes

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-43 | Principal | Miembros Ana, Beto y Dani | `name: "Nafta"`, participantes Dani y Ana | 201; participantes en ese orden | `categories` › US3-1 |
| CP-44 | Principal | — | Sin `participantIds` | Participan todos los miembros actuales | `categories` › FR-015 |
| CP-45 | 2a | Existe "Nafta" | `" nafta "` | 409 `CATEGORY_NAME_TAKEN` | `categories` › US3-3 |
| CP-46 | 2b | — | Participantes vacíos, repetidos, de otro grupo o inexistentes | 400 | `categories` › validación |
| CP-47 | A1 | Categoría con gastos | El creador o el dueño la elimina | 204; se borran sus gastos y participantes; se recalcula | `categories` › US3-6 |
| CP-48 | A2 | Ana pagó 300 entre Ana y Dani | Sumar a Beto | Beto y Dani deben 100 cada uno | `categories` › US3-8 |
| CP-49 | A3 | Dani pagó en la categoría / es el último participante | Quitarlo | 409 `PARTICIPANT_HAS_EXPENSES` / 400 | `categories` › participantes |
| CP-50 | A4 | Carla miembro, no creadora ni dueña | Renombrar, eliminar o sumar participantes | 403 | `categories` › permisos |

## CU-07 Registrar gasto

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-51 | Principal | "Nafta" con Ana y Dani | Dani pagó `"15000.50"` el `2026-10-05`, "YPF ruta 9" | 201 con los datos exactos y el autor | `expenses` › US3-2 |
| CP-52 | 2a | — | Monto `0`, `-1`, `1.234`, `10000000000`, `abc` | 400 con `fields.amount` (no se redondea) | `expenses` › FR-017 |
| CP-53 | 2a | — | Fecha inexistente (`2026-02-30`) o con otro formato | 400 | `expenses` › fecha |
| CP-54 | 2b | Beto no participa de "Nafta" | `paidById` de Beto | 400 "Quien pagó tiene que participar de la categoría" | `expenses` › US3-5 |
| CP-55 | A1 | Tres gastos con fechas distintas | Listar la categoría | Del más reciente al más antiguo | `expenses` › FR-019 |
| CP-56 | A2 | Gasto cargado por Beto | Beto cambia monto, fecha, pagador y categoría | 200; se recalculan las pendientes | `expenses` › US3-4 |
| CP-57 | A3 | Gasto cargado por Beto | Carla (miembro) lo modifica o borra | 403; GET 200 | `expenses` › US3-7 |

## CU-08 Consultar liquidaciones

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-58 | Principal | Ana pagó 300 entre Ana, Beto y Dani | Consultar | Beto→Ana 100.00 y Dani→Ana 100.00 | `settlements` › US4-1 |
| CP-59 | Principal | Deudas cruzadas en dos categorías | Consultar | Una sola transferencia por la diferencia | `settlements` › US4-2 |
| CP-60 | Principal | Cadena Ana→Beto→Dani | Consultar | Nadie paga y cobra a la vez; saldos intactos | `settlements` › US4-3 |
| CP-61 | Principal | Ana pagó 100 entre 3 | Consultar | 33.33 y 33.33; Ana absorbe el centavo (parte 33.34) | `settlements` › US4-4 |
| CP-62 | 2a | Sin gastos / gastos iguales | Consultar | Sin transferencias pendientes | `settlements` › US4-5 |
| CP-63 | Principal | Liquidaciones calculadas | Consultar dos veces; luego agregar un gasto | Mismos ids entre consultas; ids nuevos tras el cambio | `settlements` › US4-6 |
| CP-64 | Principal | Beto ya pagó 100 / pagó de más | Consultar | Pendiente por lo que falta / devolución del excedente | `settlements` › US4-7, US4-8 |
| CP-65 | Principal | 12 escenarios de referencia | Calcular en la app y en el servidor | Mismas transferencias, montos redondeados a centavos (SC-001) | `settlements.domain` › equivalencia |
| CP-66 | Principal | 2500 grupos aleatorios | Calcular | Montos enteros, sin cadenas, saldos exactos (SC-002, SC-007) | `settlements.domain` › propiedades |
| CP-67 | Principal | 20 miembros, 10 categorías, 500 gastos | 20 consultas y 20 altas de gasto | p95 < 2 s (SC-003) | Manual: `node scripts/settlements-p95.js` (quickstart §4) |

## CU-09 Registrar pago

| ID | Flujo | Precondiciones | Datos de entrada | Resultado esperado | Respaldo |
|---|---|---|---|---|---|
| CP-68 | Principal | Pendiente Beto→Ana 100 | El deudor, la acreedora o la dueña registra el pago total | Pagada, con `paidAt` y `paidBy` | `settlements.payments` › US5-1 |
| CP-69 | Principal | Pendiente Beto→Ana 100 | `amount: "60"` | Pagada por 60.00; pendiente nueva por 40.00 | `settlements.payments` › US5-7 |
| CP-70 | 1a | La pendiente fue reemplazada por un recálculo | Registrar el pago con el id viejo | 409 `SETTLEMENT_CHANGED` | `settlements.payments` › US5-6 |
| CP-71 | 1b | Ya pagada | Registrar el pago otra vez | 409 `SETTLEMENT_ALREADY_PAID` | `settlements.payments` › ya pagada |
| CP-72 | 1c | Carla miembro, no es parte ni dueña | Registrar o anular | 403 (sí puede consultar) | `settlements.payments` › US5-4 |
| CP-73 | 2a | Pendiente de 100 | `amount` 120, 0 o 1.001 | 400 con `fields.amount` | `settlements.payments` › US5-8 |
| CP-74 | A1 | Pago parcial de 60 registrado | Volver a pendiente | El pago se anula; vuelve Beto→Ana 100.00 | `settlements.payments` › US5-2/US5-9 |

Las reglas de la base de la Fase 2 (participante pagador, unicidad sin mayúsculas, cascadas,
consistencia del pago) se prueban en `server/tests/integration/model.phase2.test.js`.
