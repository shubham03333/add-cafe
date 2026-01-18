adda _table DDLS'

SET FOREIGN_KEY_CHECKS = 0;
-- run schema
-- 1. customers
CREATE TABLE customers (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customers_mobile (mobile),
  KEY idx_customers_mobile (mobile),
  KEY idx_mobile (mobile)
);

-- 2. user_roles
CREATE TABLE user_roles (
  id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  permissions JSON NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 3. tables_master
CREATE TABLE tables_master (
  id INT NOT NULL AUTO_INCREMENT,
  table_code VARCHAR(10) NOT NULL,
  table_name VARCHAR(50) DEFAULT NULL,
  capacity INT DEFAULT 4,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_tables_master_table_code (table_code),
  KEY idx_tables_master_active (is_active),
  KEY idx_tables_master_code (table_code)
);

-- 4. menu_items
CREATE TABLE menu_items (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(250) NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  is_available TINYINT(1) DEFAULT 1,
  category VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  position INT DEFAULT NULL,
  stock_quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  unit_type VARCHAR(20) DEFAULT 'pieces',
  ingredients JSON DEFAULT NULL,
  supplier_info VARCHAR(255) DEFAULT NULL,
  last_restocked TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_menu_items_category (category),
  KEY idx_menu_items_available (is_available),
  KEY idx_menu_category (category),
  KEY idx_menu_available (is_available)
);

-- 5. raw_materials
CREATE TABLE raw_materials (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_type VARCHAR(50) DEFAULT 'kg',
  current_stock DECIMAL(10,2) DEFAULT 0.00,
  min_stock_level DECIMAL(10,2) DEFAULT 5.00,
  supplier_info VARCHAR(255) DEFAULT NULL,
  last_restocked TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_raw_materials_name (name)
);

-- 6. system_settings
CREATE TABLE system_settings (
  id INT NOT NULL AUTO_INCREMENT,
  setting_name VARCHAR(50) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- 7. daily_sales
CREATE TABLE daily_sales (
  id INT NOT NULL AUTO_INCREMENT,
  sale_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daily_sales_sale_date (sale_date),
  KEY idx_daily_sales_date (sale_date)
);

-- 8. revenue_overrides
CREATE TABLE revenue_overrides (
  id INT NOT NULL AUTO_INCREMENT,
  date DATE NOT NULL,
  manual_revenue DECIMAL(10,2) NOT NULL,
  original_revenue DECIMAL(10,2) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_revenue_overrides_date (date),
  KEY idx_revenue_overrides_date (date)
);

-- 9. sales_history
CREATE TABLE sales_history (
  id INT NOT NULL AUTO_INCREMENT,
  sale_date DATE NOT NULL,
  total_orders INT NOT NULL,
  total_revenue DECIMAL(12,2) NOT NULL,
  archived_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sales_history_date (sale_date)
);

-- 10. users
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  KEY idx_users_role_id (role_id),
  KEY idx_users_username (username),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id)
    REFERENCES user_roles (id)
    ON DELETE CASCADE
);

-- 11. customer_otps
CREATE TABLE customer_otps (
  id INT NOT NULL AUTO_INCREMENT,
  customer_id INT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  used TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_customer_otps_customer_id (customer_id),
  KEY idx_customer_otps_expires_at (expires_at),
  KEY idx_customer_otps_otp_code (otp_code),
  CONSTRAINT fk_customer_otps_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers (id)
    ON DELETE CASCADE
);

-- 12. dish_raw_materials
CREATE TABLE dish_raw_materials (
  id INT NOT NULL AUTO_INCREMENT,
  dish_id INT NOT NULL,
  raw_material_id INT NOT NULL,
  quantity_required DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_dish_raw_material (dish_id, raw_material_id),
  KEY idx_dish_raw_materials_raw_material (raw_material_id),
  KEY idx_inventory_quantity (quantity_required),
  CONSTRAINT fk_dish_raw_materials_dish
    FOREIGN KEY (dish_id)
    REFERENCES menu_items (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_dish_raw_materials_raw_material
    FOREIGN KEY (raw_material_id)
    REFERENCES raw_materials (id)
    ON DELETE CASCADE
);

-- 13. orders
CREATE TABLE orders (
  id VARCHAR(36) NOT NULL,
  order_number VARCHAR(10) NOT NULL,
  items JSON NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending','preparing','ready','served','cancelled') DEFAULT 'pending',
  payment_status ENUM('pending','paid','failed') DEFAULT 'pending',
  payment_mode ENUM('cash','online') DEFAULT NULL,
  order_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  table_id INT DEFAULT NULL,
  order_type ENUM('DINE_IN','TAKEAWAY','DELIVERY') DEFAULT 'DINE_IN',
  PRIMARY KEY (id),
  KEY idx_orders_status (status),
  KEY idx_orders_order_time (order_time),
  KEY idx_orders_payment_status (payment_status),
  KEY idx_orders_payment_mode (payment_mode),
  KEY idx_orders_time_status_payment (order_time, status, payment_status),
  KEY idx_orders_time_total (order_time, total),
  KEY idx_orders_table_id (table_id),
  KEY idx_orders_order_type (order_type),
  CONSTRAINT fk_orders_table
    FOREIGN KEY (table_id)
    REFERENCES tables_master (id)
    ON DELETE SET NULL
);



SET FOREIGN_KEY_CHECKS = 1;



mysqldump -u root -p adda_prod_db \
  --no-create-info \
  --skip-triggers \
  --single-transaction \
  --set-gtid-purged=OFF \
  --skip-lock-tables \
  --compact \
  > all_tables_data_only.sql






aws s3 cp all_tables_data_only.sql s3://machines-db-mysql-backups/all_tables_data_only.sql


mysql \
  -h gateway01.ap-southeast-1.prod.aws.tidbcloud.com \
  -P 4000 \
  -u deJtPtr99UWkXtu.root \
  -p8gX5Un3zjrnGnJKL \
  adda_prod_db_a01 < all_tables_data_only.sql


mysql \
  -h gateway01.ap-southeast-1.prod.aws.tidbcloud.com \
  -P 4000 \
  -u deJtPtr99UWkXtu.root \
  --ssl-mode=REQUIRED \
  -p \
  adda_prod_db_a01

SOURCE /home/ubuntu/db_backup/all_tables_data_only.sql;
SET FOREIGN_KEY_CHECKS = 1;

  8gX5Un3zjrnGnJKL


  mysql://deJtPtr99UWkXtu.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/adda_prod_db_a01
mysql://deJtPtr99UWkXtu.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/adda_prod_db_a01