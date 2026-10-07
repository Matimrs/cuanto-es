# Quickstart: Backend base y autenticación (Fase 1)

Guía para levantar el backend y comprobar de punta a punta que la feature funciona. Los
contratos están en [contracts/auth-api.yaml](contracts/auth-api.yaml) y las reglas del modelo
en [data-model.md](data-model.md).

## Requisitos

- Docker Desktop (con Docker Compose v2).
- Node.js ≥ 22 y npm, solo para correr los tests o el servidor fuera de Docker.
- `curl` (viene con Git Bash en Windows).

## 1. Configuración

```bash
cp server/.env.example server/.env
# Editar server/.env: completar JWT_SECRET con al menos 32 caracteres aleatorios, por ejemplo:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

`server/.env` está en `.gitignore` y nunca se commitea.

## 2. Levantar el entorno (US5, FR-023)

```bash
docker compose up --build
```

**Esperado**: `db` queda *healthy*, `api` aplica las migraciones (`prisma migrate deploy`) y
muestra en el log que escucha en el puerto 3001. Las seis tablas existen y están vacías
(US4, escenario 1):

```bash
docker compose exec db psql -U cuantoes -d cuantoes -c '\dt'
# users, groups, group_members, categories, expenses, settlements, _prisma_migrations
```

## 3. Escenarios manuales

### Registro (US1)

```bash
curl -i -X POST http://localhost:3001/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ana","email":" ANA@Ejemplo.com ","password":"secreta123"}'
```

**Esperado**: `201` con `user.email = "ana@ejemplo.com"`, un `token`, y sin ningún campo de
contraseña. Repetir el mismo comando → `409 EMAIL_TAKEN` ("Ese email ya está registrado").
Probar con `"password":"corta"` → `400 VALIDATION_ERROR` con `fields.password`.

### Inicio de sesión (US2)

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@ejemplo.com","password":"secreta123"}'
```

**Esperado**: `200` con `user` y `token`. Con una contraseña incorrecta, o con
`nadie@ejemplo.com`, → `401` con **exactamente** el mismo cuerpo
(`INVALID_CREDENTIALS`, "Email o contraseña incorrectos").

### Identidad propia (US3)

```bash
TOKEN=<token del paso anterior>
curl -s http://localhost:3001/auth/me -H "Authorization: Bearer $TOKEN"
```

**Esperado**: `200 { user: { id, name, email } }`. Sin el header, o con un carácter del token
cambiado, → `401 UNAUTHENTICATED`.

### Contraseña nunca en claro (SC-003)

```bash
docker compose exec db psql -U cuantoes -d cuantoes -c 'select email, password_hash from users'
```

**Esperado**: `password_hash` empieza con `$2` (formato bcrypt). `docker compose logs api` no
muestra ninguna contraseña.

### Persistencia entre reinicios (US5, escenario 2)

```bash
docker compose down        # sin -v: conserva el volumen db_data
docker compose up -d
# repetir el login → 200
```

### Configuración faltante (FR-025)

Comentar `JWT_SECRET` en `server/.env` y correr `docker compose up api`. **Esperado**: el
contenedor termina con un mensaje que nombra `JWT_SECRET`. Volver a dejar la variable.

## 4. Tests automatizados

Con el contenedor `db` levantado:

```bash
cd server
npm install
npm test
```

**Esperado**: Jest aplica las migraciones sobre `cuantoes_test`
(`TEST_DATABASE_URL` en `.env`) y pasan las suites:

- `tests/integration/auth.register.test.js`: US1 y edge cases (concurrencia, normalización,
  72 bytes, campos desconocidos, cuerpo mal formado).
- `tests/integration/auth.login.test.js`: US2 y respuesta idéntica (SC-005).
- `tests/integration/auth.me.test.js`: US3 (token ausente, alterado, vencido o de otro
  secreto).
- `tests/integration/model.integrity.test.js`: una prueba por cada regla de FR-016 a FR-021
  (SC-008).
- `tests/unit/`: configuración (FR-025), esquemas de validación y emisión/verificación de
  tokens.

> Si la base `cuantoes_test` no existe (volumen creado antes de agregar el script de
> inicialización): `docker compose exec db createdb -U cuantoes cuantoes_test`.

## 5. Limpieza

```bash
docker compose down -v     # borra también los datos
```
