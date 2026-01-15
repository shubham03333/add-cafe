-- Add missing columns and table for table management and order types
-- Run this script to fix the database schema for table-based orders

-- Create tables_master table
CREATE TABLE tables_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_code VARCHAR(10) NOT NULL UNIQUE,
  table_name VARCHAR(100) NOT NULL,
  capacity INT DEFAULT 4,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add table_id column to orders table
ALTER TABLE orders
ADD COLUMN table_id INT DEFAULT NULL
AFTER order_time;

-- Add order_type column to orders table
ALTER TABLE orders
ADD COLUMN order_type ENUM('DINE_IN', 'TAKEAWAY', 'DELIVERY') DEFAULT 'DINE_IN'
AFTER table_id;

-- Add foreign key constraint for table_id
ALTER TABLE orders
ADD CONSTRAINT fk_orders_table_id
FOREIGN KEY (table_id) REFERENCES tables_master(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_order_type ON orders(order_type);
CREATE INDEX idx_tables_master_active ON tables_master(is_active);
CREATE INDEX idx_tables_master_code ON tables_master(table_code);

-- Insert some sample tables (you can modify these as needed)
INSERT INTO tables_master (table_code, table_name, capacity, is_active) VALUES
('T01', 'Table 1', 4, 1),
('T02', 'Table 2', 4, 1),
('T03', 'Table 3', 6, 1),
('T04', 'Table 4', 2, 1),
('T05', 'Table 5', 4, 1);
