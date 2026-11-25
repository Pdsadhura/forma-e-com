-- AlterTable
ALTER TABLE "products" ADD COLUMN "specifications" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "specifications" JSONB NOT NULL DEFAULT '[]';
