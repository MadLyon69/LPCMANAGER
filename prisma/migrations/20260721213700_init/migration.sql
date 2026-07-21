-- CreateEnum
CREATE TYPE "PriceMode" AS ENUM ('MARGE_LIBRE', 'PRIX_IMPOSE');

-- CreateEnum
CREATE TYPE "MouvementType" AS ENUM ('ENTREE_FACTURE', 'AJUSTEMENT', 'INVENTAIRE', 'SORTIE');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "categoryId" TEXT,
    "supplierId" TEXT,
    "purchasePriceHT" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "priceMode" "PriceMode" NOT NULL DEFAULT 'MARGE_LIBRE',
    "marginRate" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "sellPriceTTC" DOUBLE PRECISION NOT NULL,
    "stockQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stockAlertSeuil" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unite',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "numero" TEXT,
    "fileName" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "rawReference" TEXT,
    "rawDesignation" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "purchasePriceHT" DOUBLE PRECISION NOT NULL,
    "tvaRate" DOUBLE PRECISION,
    "productId" TEXT,
    "previousPriceHT" DOUBLE PRECISION,
    "priceVariationPct" DOUBLE PRECISION,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchasePriceHT" DOUBLE PRECISION NOT NULL,
    "sellPriceTTC" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MouvementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "labelWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "labelHeightMm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "labelColumns" INTEGER NOT NULL DEFAULT 3,
    "defaultTvaRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "defaultMarginRate" DOUBLE PRECISION NOT NULL DEFAULT 30,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nom_key" ON "Category"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Product_reference_key" ON "Product"("reference");

-- CreateIndex
CREATE INDEX "Product_designation_idx" ON "Product"("designation");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_date_idx" ON "PriceHistory"("productId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_productId_date_idx" ON "StockMovement"("productId", "date");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
