# Diagrama de clases

El diagrama se divide en dos paquetes:

- **Modelo persistido**: el de la Fase 1 más lo que suma la Fase 2 (participantes por categoría,
  autores de categorías y gastos, datos del pago). Fuentes: `specs/001-backend-auth-base/data-model.md`,
  `specs/002-groups-expenses-settlements/data-model.md` y `server/prisma/schema.prisma`.
- **Dominio del cliente**: las clases `Category`, `Peer` y la función `calculate()` de la app,
  que el servidor reutiliza sin cambios para calcular las liquidaciones.

Es la base del diagrama de clases de la Plantilla 03 (04/12) y **no reemplaza al ERD**.

```plantuml
@startuml
hide circle
skinparam classAttributeIconSize 0

package "Modelo persistido (server/prisma)" {
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
    + displayName() : String
  }

  class Category {
    - id : UUID
    - name : String [1..100] {único en el grupo, sin mayúsculas}
    - createdAt : DateTime
  }

  class CategoryParticipant {
    - id : UUID
    - createdAt : DateTime {define el orden de alta}
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
    - paidAt : DateTime [0..1]
    - position : Int
    - createdAt : DateTime
  }
}

package "Dominio del cliente (client/src/, reutilizado)" {
  class "Category (cliente)" as CCategory {
    - id
    - name
    - persons : Person + gasto [*]
    + addPerson(person, gasto)
    + average() : Number
    + distribute() : Peer[*]
  }

  class Peer {
    - creditor
    - debtor
    - amount : Number
  }

  class "calculate()" as Calculate <<function>> {
    + calculate(categorys) : Peer[*]
    - deleteChain(peers) : Peer[*]
  }
}

User "1" -- "0..*" Group : owner >
User "0..1" -- "0..*" GroupMember : es >
User "1" -- "0..*" Category : createdBy <
User "1" -- "0..*" Expense : createdBy <
User "0..1" -- "0..*" Settlement : paidBy <
Group "1" *-- "0..*" GroupMember : members
Group "1" *-- "0..*" Category : categories
Group "1" *-- "0..*" Expense : expenses
Group "1" *-- "0..*" Settlement : settlements
Category "1" *-- "1..*" CategoryParticipant : participants
GroupMember "1" -- "0..*" CategoryParticipant : participa >
Category "1" *-- "0..*" Expense : agrupa >
CategoryParticipant "1" -- "0..*" Expense : paidBy <
GroupMember "1" -- "0..*" Settlement : creditor <
GroupMember "1" -- "0..*" Settlement : debtor <

Calculate ..> CCategory : usa distribute()
CCategory ..> Peer : crea
Calculate ..> Peer : unifica y elimina cadenas
Settlement ..> Peer : <<persistencia de>>

note right of GroupMember
  Invitado sin cuenta: user nulo y alias obligatorio,
  único entre los invitados del grupo.
  Un usuario no figura dos veces en el mismo grupo.
end note

note bottom of Expense
  Quien pagó es participante de la
  categoría, del mismo grupo (FR-018).
end note

note bottom of Settlement
  creditor ≠ debtor, del mismo grupo.
  Pendiente: resultado del último recálculo.
  Pagada (paid, paidAt, paidBy): pago realizado,
  total o parcial; nunca se modifica.
end note

note left of Group
  El dueño (owner) no necesita ser miembro.
  Solo paga gastos o figura en liquidaciones
  si además es GroupMember.
end note
@enduml
```

## Estados de una liquidación

```plantuml
@startuml
[*] --> Pendiente : recálculo
Pendiente --> [*] : recálculo (se reemplaza)
Pendiente --> Pagada : registrar pago (total o parcial)
Pagada --> [*] : volver a pendiente (se anula y se recalcula)
@enduml
```

## Reglas de integridad

| Regla | Dónde se garantiza |
|---|---|
| Un miembro sin cuenta tiene alias no vacío | `CHECK group_members_user_or_alias` |
| Un usuario no se repite en un grupo | `UNIQUE (group_id, user_id)` |
| Alias de invitados únicos sin distinguir mayúsculas (FR-009 de la 002) | índice único parcial `group_members_group_alias_ci` |
| Montos con 2 decimales exactos y mayores que cero | `DECIMAL(12,2)` + `CHECK amount > 0` |
| Acreedor ≠ deudor, del mismo grupo; `paid` por defecto `false` | `CHECK settlements_distinct_members` + FK compuestas |
| Una liquidación pagada tiene fecha y autor del pago (FR-028 de la 002) | `CHECK settlements_paid_at_consistent` y `settlements_paid_by_consistent` |
| Categoría y pagador del mismo grupo que el gasto | FK compuestas `(category_id, group_id)` y `(paid_by_id, group_id)` |
| Quien pagó es participante de la categoría (FR-018 de la 002) | FK `(category_id, paid_by_id)` → `category_participants` |
| Nombre de categoría único en el grupo, sin distinguir mayúsculas | índice único `categories_group_name_ci` |
| Todo grupo tiene dueño, que no necesita ser miembro | `owner_id NOT NULL` |
| Borrar un grupo o una categoría borra su contenido; no se borra un miembro o participante con gastos | `ON DELETE CASCADE` / `NO ACTION` |

## Correspondencia con el dominio del cliente

| Clase del cliente | Clase persistida | Cómo se conecta en la Fase 2 |
|---|---|---|
| `Person` | `GroupMember` (+ `User` opcional) | el `id` del miembro es el `id` de la persona que recibe `distribute()` |
| `Category` | `Category` + `CategoryParticipant` | cada participante entra con lo que pagó (la suma de sus `Expense`) menos su parte |
| `Peer` | `Settlement` | cada `Peer` que devuelve `calculate()` se guarda como liquidación pendiente |
