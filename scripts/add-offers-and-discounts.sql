ALTER TABLE orders ADD COLUMN gross_total DECIMAL(10,2) NULL;

ALTER TABLE orders ADD COLUMN discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE orders ADD COLUMN offer_code VARCHAR(32) NULL;

UPDATE orders SET gross_total = total, discount_total = 0.00 WHERE gross_total IS NULL;

ALTER TABLE daily_sales ADD COLUMN gross_sales DECIMAL(12,2) NULL;

ALTER TABLE daily_sales ADD COLUMN discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00;

UPDATE daily_sales SET gross_sales = total_revenue, discount_total = 0.00 WHERE gross_sales IS NULL;

CREATE TABLE IF NOT EXISTS offers (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  scope VARCHAR(16) NOT NULL DEFAULT 'bill',
  discount_type VARCHAR(16) NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL,
  menu_item_ids JSON NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  max_uses_per_phone INT NOT NULL DEFAULT 1,
  max_uses_total INT NULL,
  min_bill DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  require_phone TINYINT(1) NOT NULL DEFAULT 1,
  stackable TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_offers_code (code),
  KEY idx_offers_active (is_active)
);

CREATE TABLE IF NOT EXISTS offer_redemptions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  offer_id INT NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(16) NOT NULL DEFAULT 'used',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_offer_phone (offer_id, customer_phone),
  UNIQUE KEY uk_offer_order (offer_id, order_id),
  KEY idx_redemptions_order (order_id),
  KEY idx_redemptions_phone (customer_phone)
);
