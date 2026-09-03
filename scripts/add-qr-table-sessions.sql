-- QR dine-in sessions: stop table-QR orders after close/timeout.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS table_qr_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  table_id INT NOT NULL,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP NULL,
  last_accepted_at TIMESTAMP NULL,
  opened_by VARCHAR(16) NOT NULL DEFAULT 'qr',
  PRIMARY KEY (id),
  KEY idx_table_qr_open (table_id, closed_at, expires_at)
);
