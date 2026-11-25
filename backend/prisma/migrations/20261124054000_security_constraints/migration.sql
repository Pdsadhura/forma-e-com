-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "marketing_attributions" ALTER COLUMN "capturedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "customerEmailSentAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "ownerEmailSentAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "metaPurchaseSentAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "failureNotifiedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "processed_webhook_events" ALTER COLUMN "processedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

ALTER TABLE "products" ADD CONSTRAINT "products_price_positive" CHECK ("price" > 0);
ALTER TABLE "products" ADD CONSTRAINT "products_sale_price_nonnegative" CHECK ("salePrice" IS NULL OR "salePrice" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonnegative" CHECK ("stockQuantity" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_nonnegative" CHECK ("subtotal" >= 0 AND "shippingAmount" >= 0 AND "total" >= 0);

CREATE INDEX "orders_open_reservation_idx" ON "orders" ("createdAt")
WHERE "orderStatus" = 'PENDING' AND "paymentStatus" = 'PENDING';

-- Deny Supabase Data API access. The table owner used by Prisma still bypasses RLS.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'products',
    'product_images',
    'customers',
    'addresses',
    'orders',
    'order_items',
    'payments',
    'marketing_attributions',
    'processed_webhook_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', tbl);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', tbl);
    END IF;
  END LOOP;
END $$;
