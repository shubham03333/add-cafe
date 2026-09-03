-- POS catalog integration columns and idempotency store.
-- Run manually against TiDB. Do not auto-run in production.

-- Menu delta support (safe if columns already exist: skip the failed statement)
ALTER TABLE menu_items
  ADD COLUMN description TEXT NULL;

ALTER TABLE menu_items
  ADD COLUMN image_url VARCHAR(500) NULL;

ALTER TABLE menu_items
  ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Catalog-originated order metadata
ALTER TABLE orders
  ADD COLUMN external_source VARCHAR(50) NULL;

ALTER TABLE orders
  ADD COLUMN external_ref VARCHAR(100) NULL;

ALTER TABLE orders
  ADD COLUMN idempotency_key VARCHAR(64) NULL;

ALTER TABLE orders
  ADD UNIQUE KEY uk_orders_idempotency_key (idempotency_key);

CREATE TABLE IF NOT EXISTS integration_idempotency (
  idempotency_key VARCHAR(64) NOT NULL,
  response_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idempotency_key)
);

CREATE INDEX idx_orders_external_source ON orders (external_source);
CREATE INDEX idx_orders_external_ref ON orders (external_ref);
