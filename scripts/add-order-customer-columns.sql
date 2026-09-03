-- Guest name/phone on QR catalog orders. Waiter orders stay NULL.
-- Idempotent: skips a column if it already exists (TiDB / MySQL).

-- customer_name
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'customer_name'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE orders ADD COLUMN customer_name VARCHAR(100) NULL',
  'SELECT ''customer_name already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- customer_phone
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'customer_phone'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(15) NULL',
  'SELECT ''customer_phone already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
