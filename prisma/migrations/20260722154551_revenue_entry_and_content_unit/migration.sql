-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('JOUR', 'MOIS');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "contentUnit" TEXT,
ADD COLUMN     "contentValue" DOUBLE PRECISION;

-- RenameTable (préserve les saisies déjà existantes)
ALTER TABLE "DailyRevenue" RENAME TO "RevenueEntry";
ALTER TABLE "RevenueEntry" RENAME CONSTRAINT "DailyRevenue_pkey" TO "RevenueEntry_pkey";

-- AlterTable
ALTER TABLE "RevenueEntry"
  ADD COLUMN "periodType" "PeriodType" NOT NULL DEFAULT 'JOUR',
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "tvaRate" DOUBLE PRECISION;

-- DropIndex (la date n'est plus unique : plusieurs lignes par jour/mois sont permises)
ALTER TABLE "RevenueEntry" DROP CONSTRAINT IF EXISTS "DailyRevenue_date_key";
DROP INDEX IF EXISTS "DailyRevenue_date_key";
DROP INDEX IF EXISTS "DailyRevenue_date_idx";

-- CreateIndex
CREATE INDEX "RevenueEntry_date_idx" ON "RevenueEntry"("date");

-- CreateIndex
CREATE INDEX "RevenueEntry_categoryId_idx" ON "RevenueEntry"("categoryId");

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
