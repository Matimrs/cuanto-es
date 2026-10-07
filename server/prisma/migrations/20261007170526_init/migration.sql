-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID,
    "alias" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "paid_by_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" VARCHAR(200),
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "creditor_id" UUID NOT NULL,
    "debtor_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_id_group_id_key" ON "group_members"("id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_group_id_name_key" ON "categories"("group_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_group_id_key" ON "categories"("id", "group_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_group_id_fkey" FOREIGN KEY ("category_id", "group_id") REFERENCES "categories"("id", "group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_id_group_id_fkey" FOREIGN KEY ("paid_by_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_creditor_id_group_id_fkey" FOREIGN KEY ("creditor_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_debtor_id_group_id_fkey" FOREIGN KEY ("debtor_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Reglas de integridad que Prisma no expresa (research R10). Agregadas a mano.
-- ---------------------------------------------------------------------------

-- FR-017: montos estrictamente positivos
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_amount_positive" CHECK ("amount" > 0);

-- FR-018: acreedor y deudor son miembros distintos
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_distinct_members" CHECK ("creditor_id" <> "debtor_id");

-- FR-016: un miembro sin cuenta debe tener alias no vacío
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_or_alias"
  CHECK ("user_id" IS NOT NULL OR ("alias" IS NOT NULL AND btrim("alias") <> ''));
