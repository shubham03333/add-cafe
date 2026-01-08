

+-----------------------+
| Tables_in_add_test_db |
+-----------------------+
| customer_otps         |
| customers             |
| daily_sales           |
| dish_raw_materials    |
| menu_items            |
| orders                |
| raw_materials         |
| revenue_overrides     |
| sales_history         |
| system_settings       |
| user_roles            |
| users                 |
+-----------------------+


-- Performance optimization indexes for cafe orders database
-- Run this script to improve query performance on production

-- Index for order_time queries (used in sales reports and order filtering)
CREATE INDEX idx_orders_order_time ON orders(order_time);

-- Index for payment_status (used in revenue calculations)
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Index for status (used in order management and filtering)
CREATE INDEX idx_orders_status ON orders(status);

-- Composite index for common order queries (time + status + payment)
CREATE INDEX idx_orders_time_status_payment ON orders(order_time, status, payment_status);

-- Index for menu items queries
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_menu_available ON menu_items(is_available);

-- Index for inventory queries
CREATE INDEX id ON dish_raw_materials(id);
CREATE INDEX idx_inventory_quantity ON dish_raw_materials(quantity_required);



-- Index for daily sales queries
CREATE INDEX idx_daily_sales_date ON daily_sales(date);

-- Index for revenue overrides
CREATE INDEX idx_revenue_overrides_date ON revenue_overrides(date);

-- Index for user queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Index for customer queries
CREATE INDEX idx_mobile ON customers(mobile);

-- Composite index for order analytics (time + total for revenue queries)
CREATE INDEX idx_orders_time_total ON orders(order_time, total);

-- Index for order items JSON queries (if using JSON_EXTRACT)
-- Note: For MySQL 8.0+, consider using generated columns for better performance
-- ALTER TABLE orders ADD COLUMN total_items INT GENERATED ALWAYS AS (JSON_LENGTH(items)) STORED;
-- CREATE INDEX idx_orders_total_items ON orders(total_items);

-- Optimize table storage for better performance
OPTIMIZE TABLE orders;
OPTIMIZE TABLE menu_items;
OPTIMIZE TABLE dish_raw_materials;
OPTIMIZE TABLE daily_sales;
OPTIMIZE TABLE users;
OPTIMIZE TABLE customers;

-- Show index information for verification
SHOW INDEX FROM orders;
SHOW INDEX FROM menu_items;
SHOW INDEX FROM dish_raw_materials;
SHOW INDEX FROM daily_sales;
