-- Add payment_status column to orders table
-- Run this script to add payment status tracking to existing orders

ALTER TABLE orders
ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending'
AFTER status;

-- Update existing orders to have payment_status = 'paid' if status = 'served'
UPDATE orders
SET payment_status = 'paid'
WHERE status = 'served';

-- Add index for payment_status for better query performance
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
