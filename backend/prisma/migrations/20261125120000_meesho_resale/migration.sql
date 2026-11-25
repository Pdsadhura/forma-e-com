-- AlterTable
ALTER TABLE "products" ADD COLUMN "meeshoProductId" TEXT,
ADD COLUMN "meeshoUrl" TEXT,
ADD COLUMN "meeshoPrice" DECIMAL(12,2),
ADD COLUMN "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "meeshoOrderId" TEXT,
ADD COLUMN "meeshoPlacedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "size" TEXT,
ADD COLUMN "meeshoProductId" TEXT,
ADD COLUMN "meeshoUrl" TEXT,
ADD COLUMN "meeshoPrice" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "products_meeshoProductId_idx" ON "products"("meeshoProductId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_meeshoOrderId_key" ON "orders"("meeshoOrderId");
