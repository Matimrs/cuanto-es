# Diagrama de clases (primer borrador)

Modelo de dominio persistido en la Fase 1, a partir de
`specs/001-backend-auth-base/data-model.md` y `server/prisma/schema.prisma`. Es la base del
diagrama de clases de la Plantilla 03 (04/12) y **no reemplaza al ERD**: en la Fase 2 se le
suman las operaciones (reparto con `calculate()` / `distribute()`) y las clases de dominio del
cliente (`Person`, `Category`, `Peer`).

```plantuml
@startuml
hide circle
skinparam classAttributeIconSize 0

class User {
  - id : UUID
  - name : String [1..100]
  - email : String {unique, normalizado}
  - passwordHash : String {hash bcrypt}
  - createdAt : DateTime
  - updatedAt : DateTime
}

class Group {
  - id : UUID
  - name : String [1..100]
  - createdAt : DateTime
}

class GroupMember {
  - id : UUID
  - alias : String [0..1]
  - createdAt : DateTime
}

class Category {
  - id : UUID
  - name : String [1..100]
  - createdAt : DateTime
}

class Expense {
  - id : UUID
  - amount : Decimal(12,2) {> 0, ARS}
  - description : String [0..1]
  - date : Date
  - createdAt : DateTime
}

class Settlement {
  - id : UUID
  - amount : Decimal(12,2) {> 0, ARS}
  - paid : Boolean = false
  - createdAt : DateTime
}

User "1" -- "0..*" Group : owner >
User "0..1" -- "0..*" GroupMember : es >
Group "1" *-- "0..*" GroupMember : members
Group "1" *-- "0..*" Category : categories
Group "1" *-- "0..*" Expense : expenses
Group "1" *-- "0..*" Settlement : settlements
Category "1" -- "0..*" Expense : agrupa >
GroupMember "1" -- "0..*" Expense : paidBy <
GroupMember "1" -- "0..*" Settlement : creditor <
GroupMember "1" -- "0..*" Settlement : debtor <

note right of GroupMember
  Invitado sin cuenta: user nulo y alias obligatorio (FR-016).
  Un usuario no figura dos veces en el mismo grupo.
end note

note bottom of Expense
  La categoría y quien pagó pertenecen
  al mismo grupo que el gasto (FR-019).
end note

note bottom of Settlement
  creditor ≠ debtor, ambos miembros
  del mismo grupo (FR-018).
end note

note left of Group
  El dueño (owner) no necesita ser miembro.
  Solo paga gastos o figura en liquidaciones
  si además es GroupMember (FR-021).
end note
@enduml
```

## Reglas de integridad (FR-015 a FR-021)

| Regla | Dónde se garantiza |
|---|---|
| Un miembro sin cuenta tiene alias no vacío (FR-016) | `CHECK group_members_user_or_alias` |
| Un usuario no se repite en un grupo (FR-016) | `UNIQUE (group_id, user_id)` |
| Montos con 2 decimales exactos y mayores que cero (FR-017) | `DECIMAL(12,2)` + `CHECK amount > 0` |
| Acreedor ≠ deudor, del mismo grupo; `paid` por defecto `false` (FR-018) | `CHECK settlements_distinct_members` + FK compuestas |
| Categoría y pagador del mismo grupo que el gasto (FR-019) | FK compuestas `(category_id, group_id)` y `(paid_by_id, group_id)` |
| Nombre de categoría único en el grupo (FR-020) | `UNIQUE (group_id, name)` |
| Todo grupo tiene dueño, que no necesita ser miembro (FR-021) | `owner_id NOT NULL` |

## Correspondencia con el dominio del cliente

| Clase del cliente | Clase persistida |
|---|---|
| `Person` | `GroupMember` (+ `User` opcional) |
| `Category` | `Category` (el gasto agregado por persona pasa a ser la suma de sus `Expense`) |
| `Peer` | `Settlement` (más el estado `paid`) |
