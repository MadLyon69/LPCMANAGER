-- CreateTable
CREATE TABLE "DailyRevenue" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountTTC" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyRevenue_date_key" ON "DailyRevenue"("date");

-- CreateIndex
CREATE INDEX "DailyRevenue_date_idx" ON "DailyRevenue"("date");
