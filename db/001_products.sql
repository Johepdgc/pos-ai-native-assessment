CREATE DATABASE IF NOT EXISTS pos_assessment
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pos_assessment;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  barcode VARCHAR(80) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_barcode (barcode),
  KEY ix_products_name (name),
  CONSTRAINT chk_products_price CHECK (price > 0 AND price <= 999999.99)
) ENGINE=InnoDB;
