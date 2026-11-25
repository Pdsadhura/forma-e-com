-- AlterTable
ALTER TABLE "products" ADD COLUMN "pid" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "pid" TEXT;

-- CreateIndex
CREATE INDEX "products_pid_idx" ON "products"("pid");
