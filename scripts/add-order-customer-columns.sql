-- Guest name/phone on QR catalog orders. Waiter orders stay NULL.
-- Skip a statement if that column already exists.

ALTER TABLE orders
  ADD COLUMN customer_name VARCHAR(100) NULL;

ALTER TABLE orders
  ADD COLUMN customer_phone VARCHAR(15) NULL;
