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
