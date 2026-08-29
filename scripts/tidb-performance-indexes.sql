-- TiDB / MySQL indexes for cafe POS hot paths
-- Safe to re-run: uses IF NOT EXISTS (TiDB 7+ / MySQL 8+)

-- Chef queue and active-order lists
CREATE INDEX IF NOT EXISTS idx_orders_status_time ON orders (status, order_time);

-- Today's sales / paid revenue (range on order_time after payment_status)
CREATE INDEX IF NOT EXISTS idx_orders_payment_time ON orders (payment_status, order_time);

-- Table occupancy join
CREATE INDEX IF NOT EXISTS idx_orders_table_active ON orders (table_id, order_type, status);

-- Daily order-number allocation
CREATE INDEX IF NOT EXISTS idx_orders_time_number ON orders (order_time, order_number);

-- Timezone / settings lookup
CREATE INDEX IF NOT EXISTS idx_system_settings_name ON system_settings (setting_name);

-- Analyze after index creation (TiDB)
ANALYZE TABLE orders;
ANALYZE TABLE menu_items;
ANALYZE TABLE tables_master;
ANALYZE TABLE system_settings;
