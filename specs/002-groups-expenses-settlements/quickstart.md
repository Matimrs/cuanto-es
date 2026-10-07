# Quickstart: Grupos, gastos y liquidaciones (Fase 2)

Guía para validar la Fase 2 de punta a punta. Contrato:
[contracts/groups-api.yaml](contracts/groups-api.yaml). Modelo y reglas:
[data-model.md](data-model.md). Decisiones: [research.md](research.md).

## Requisitos

- Lo mismo que en la Fase 1 (`specs/001-backend-auth-base/quickstart.md`), con **Node.js ≥ 24**
  (research R9).
- `npm install` **en la raíz y en `server/`**: el cálculo usa `src/utils/calculate.js` de la SPA,
  que importa `uuid` desde el `node_modules` de la raíz (research R1).

## 1. Levantar

```bash
docker compose up --build        # aplica la migración nueva de la Fase 2
```

**Esperado**: el log de `api` muestra dos migraciones aplicadas (`init` y
`groups_expenses_settlements`) y `\dt` lista también `category_participants`.

## 2. Recorrido manual (US1–US5)

Con tres cuentas (Ana, Beto, Carla) creadas con `POST /auth/register`, cada una con su token
(`$ANA`, `$BETO`, `$CARLA`). Todas las rutas llevan `-H "Authorization: Bearer $TOKEN"`.

| Paso | Solicitud | Esperado |
|---|---|---|
| 1 | Ana: `POST /groups {"name":"Viaje"}` | 201, `role: owner` (US1) |
| 2 | Carla: `GET /groups/{id}` | 404 `NOT_FOUND` (US1-3, SC-004) |
| 3 | Ana: `POST /groups/{id}/members {"email":"beto@ejemplo.com"}` y `{"alias":"Dani"}` | 201 y 201; Beto ve el grupo en `GET /groups` (US2) |
| 4 | Ana: `POST /groups/{id}/members {"email":"ana@ejemplo.com"}` | 201: la dueña ahora también es miembro (US2-6) |
| 5 | Beto: `POST /groups/{id}/categories {"name":"Nafta"}` | 201 con los 3 miembros como participantes (FR-015) |
| 6 | Beto: `POST …/categories/{nafta}/expenses {"paidById":"<Ana>","amount":"300","date":"2026-10-05"}` | 201, `amount: "300.00"` |
| 7 | Ana: `GET /groups/{id}/settlements` | `pending`: Beto→Ana 100.00 y Dani→Ana 100.00 (US4-1) |
| 8 | Repetir el paso 7 | mismos `id` y montos: consultar no recalcula (FR-027) |
| 9 | Carla: `PATCH …/settlements/{Beto→Ana}` | 404; Dani (sin cuenta) no puede, pero Ana sí (US5) |
| 10 | Beto: `PATCH …/settlements/{Beto→Ana} {"paid":true,"amount":"60"}` | `paid` tiene 60.00; `pending` tiene Beto→Ana 40.00 (US5-7) |
| 11 | Ana: `PATCH {"paid":true}` sobre el id de Dani→Ana del paso 7 (el recálculo del paso 10 lo reemplazó) | 409 `SETTLEMENT_CHANGED` (FR-027c). Sobre el id de Beto→Ana del paso 7 → 409 `SETTLEMENT_ALREADY_PAID`, porque el pago parcial convirtió esa fila en el pago registrado (research R6) |
| 12 | Beto: `PATCH …/expenses/{gasto}` (gasto que cargó Beto) con `"amount":"150"` | 200; las pendientes se recalculan descontando el pago de 60 (US4-7/8) |
| 13 | Carla, como miembro sin permisos: agregarla con su email, y que intente borrar el gasto de Beto | 403 `FORBIDDEN` (FR-003a) |
| 14 | Ana: `DELETE /groups/{id}/members/{Dani}` | 409 si Dani pagó algo; 204 si no (FR-012) |
| 15 | Ana: `DELETE /groups/{id}` | 204; `GET /groups` de Beto ya no lo muestra (US1-4) |

## 3. Tests automatizados

```bash
cd server
npm test
```

**Esperado**: pasan las suites de la Fase 1 y las nuevas:

- `tests/unit/settlements.domain.test.js`: adaptador del cálculo. Los ≥ 10 escenarios de
  referencia comparados con la app (SC-001), la regla del centavo sobrante (FR-024a), los pagos
  como entrada (FR-027a), el determinismo (FR-025) y las propiedades sobre grupos aleatorios:
  montos enteros y saldos conservados (SC-002, SC-007).
- `tests/unit/money.test.js`: conversión string ↔ centavos y rechazo de más de 2 decimales.
- `tests/integration/groups.test.js`, `members.test.js`, `categories.test.js`,
  `expenses.test.js`, `settlements.test.js` y `settlements.payments.test.js`: cada historia, cada
  permiso (`404` sin acceso, `403` sin permiso) y cada regla de validación (SC-006). Arman sus
  datos con `tests/setup/factories.js`, sin depender de los endpoints de otras historias.
- `tests/integration/model.phase2.test.js`: reglas de la base (participante pagador, unicidad sin
  mayúsculas, cascadas).

El script de test ya incluye `--experimental-vm-modules` (necesario para cargar el dominio del
cliente desde Jest, research R9). La advertencia "VM Modules is an experimental feature" es
esperada.

## 4. Rendimiento (SC-003)

```bash
cd server
node scripts/settlements-p95.js     # grupo de 20 miembros, 10 categorías y 500 gastos
```

**Esperado**: p95 < 2000 ms al consultar las liquidaciones y al registrar un gasto (que
dispara el recálculo).

Medición del 2026-10-07 (Docker Desktop en Windows, contenedor `api` con Node 24.21; 20 miembros,
10 categorías, 500 gastos → 46 pendientes): `GET /settlements` mediana 18 ms, **p95 22 ms**;
alta de gasto con recálculo mediana 32 ms, **p95 36 ms**.

## 5. La SPA sigue funcionando

```bash
npm run build    # en la raíz
```

**Esperado**: compila sin advertencias nuevas. El único cambio en el cliente es la extensión
`.js` en los imports de `src/classes` y `src/utils` (research R1).
