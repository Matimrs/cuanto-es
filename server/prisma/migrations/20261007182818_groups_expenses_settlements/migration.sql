/*
  Warnings:

  - Added the required column `created_by_id` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_group_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_category_id_group_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_group_id_fkey";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_paid_by_id_group_id_fkey";

-- DropForeignKey
ALTER TABLE "group_members" DROP CONSTRAINT "group_members_group_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_creditor_id_group_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_debtor_id_group_id_fkey";

-- DropForeignKey
ALTER TABLE "settlements" DROP CONSTRAINT "settlements_group_id_fkey";

-- DropIndex
DROP INDEX "categories_group_id_name_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "created_by_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "created_by_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "settlements" ADD COLUMN     "paid_at" TIMESTAMPTZ,
ADD COLUMN     "paid_by_id" UUID,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "category_participants" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_participants_category_id_member_id_key" ON "category_participants"("category_id", "member_id");

-- CreateIndex
CREATE INDEX "expenses_group_id_idx" ON "expenses"("group_id");

-- CreateIndex
CREATE INDEX "settlements_group_id_paid_idx" ON "settlements"("group_id", "paid");

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_participants" ADD CONSTRAINT "category_participants_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_participants" ADD CONSTRAINT "category_participants_category_id_group_id_fkey" FOREIGN KEY ("category_id", "group_id") REFERENCES "categories"("id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_participants" ADD CONSTRAINT "category_participants_member_id_group_id_fkey" FOREIGN KEY ("member_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_group_id_fkey" FOREIGN KEY ("category_id", "group_id") REFERENCES "categories"("id", "group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_id_group_id_fkey" FOREIGN KEY ("paid_by_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_paid_by_id_fkey" FOREIGN KEY ("category_id", "paid_by_id") REFERENCES "category_participants"("category_id", "member_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_creditor_id_group_id_fkey" FOREIGN KEY ("creditor_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_debtor_id_group_id_fkey" FOREIGN KEY ("debtor_id", "group_id") REFERENCES "group_members"("id", "group_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Reglas que Prisma no expresa (specs/002-groups-expenses-settlements, research R8). A mano.
-- ---------------------------------------------------------------------------

-- FR-013: nombre de categoría único en el grupo, sin distinguir mayúsculas (se guarda recortado)
CREATE UNIQUE INDEX "categories_group_name_ci" ON "categories" ("group_id", lower("name"));

-- FR-009: alias de invitado único en el grupo, sin distinguir mayúsculas
CREATE UNIQUE INDEX "group_members_group_alias_ci" ON "group_members" ("group_id", lower("alias"))
  WHERE "user_id" IS NULL;

-- FR-028: una liquidación pagada registra cuándo y quién; una pendiente, ninguno de los dos
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_at_consistent"
  CHECK ("paid" = ("paid_at" IS NOT NULL));
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_paid_by_consistent"
  CHECK ("paid" = ("paid_by_id" IS NOT NULL));
