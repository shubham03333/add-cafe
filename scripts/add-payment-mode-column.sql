-- Add payment_mode column to orders table
-- Run this script to add payment mode tracking to existing orders

ALTER TABLE orders
ADD COLUMN payment_mode ENUM('cash', 'online') DEFAULT NULL
AFTER payment_status;

-- Add index for payment_mode for better query performance
CREATE INDEX idx_orders_payment_mode ON orders(payment_mode);
