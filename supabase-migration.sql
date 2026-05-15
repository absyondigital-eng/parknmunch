-- ============================================================
-- Park N Munch — Database Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Remove customer_email (business does not collect email)
ALTER TABLE orders DROP COLUMN IF EXISTS customer_email;

-- 2. Ensure optional fields are nullable
ALTER TABLE orders ALTER COLUMN notes DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN bay_number DROP NOT NULL;

-- 3. Ensure required fields are NOT NULL
ALTER TABLE orders ALTER COLUMN customer_name    SET NOT NULL;
ALTER TABLE orders ALTER COLUMN customer_phone   SET NOT NULL;
ALTER TABLE orders ALTER COLUMN car_registration SET NOT NULL;
ALTER TABLE orders ALTER COLUMN order_items      SET NOT NULL;
ALTER TABLE orders ALTER COLUMN subtotal         SET NOT NULL;
ALTER TABLE orders ALTER COLUMN total            SET NOT NULL;
ALTER TABLE orders ALTER COLUMN payment_status   SET NOT NULL;
ALTER TABLE orders ALTER COLUMN order_status     SET NOT NULL;

-- 4. Migrate any legacy cancelled orders → new
UPDATE orders SET order_status = 'new' WHERE order_status = 'cancelled';

-- 5. Enforce allowed status values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('new', 'preparing', 'ready', 'completed', 'refunded'));

-- 6. Confirm order_items is JSONB
-- (No-op if already JSONB — run this only if needed)
-- ALTER TABLE orders ALTER COLUMN order_items TYPE jsonb USING order_items::jsonb;
