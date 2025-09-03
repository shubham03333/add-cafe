-- Add customer_otps table for storing OTP codes for forgot password functionality
-- Run this script in your PlanetScale MySQL database

CREATE TABLE customer_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_otps_customer_id (customer_id),
  INDEX idx_customer_otps_expires_at (expires_at),
  INDEX idx_customer_otps_otp_code (otp_code)
);

-- Add comment for documentation
ALTER TABLE customer_otps COMMENT = 'Stores OTP codes for customer password reset functionality';
