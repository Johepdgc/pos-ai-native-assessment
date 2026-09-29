USE pos_assessment;

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_sales_total CHECK (total >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total DECIMAL(14,2) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_sale_items_sale_id (sale_id),
  KEY ix_sale_items_product_id (product_id),
  CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id),
  CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_sale_items_price CHECK (unit_price > 0 AND unit_price <= 999999.99),
  CONSTRAINT chk_sale_items_quantity CHECK (quantity > 0)
) ENGINE=InnoDB;

DROP PROCEDURE IF EXISTS sp_register_sale;
DELIMITER $$
CREATE PROCEDURE sp_register_sale(
  IN p_items LONGTEXT,
  OUT p_sale_id BIGINT UNSIGNED,
  OUT p_total DECIMAL(14,2)
)
BEGIN
  DECLARE v_index INT DEFAULT 0;
  DECLARE v_count INT;
  DECLARE v_product_id BIGINT UNSIGNED;
  DECLARE v_quantity INT UNSIGNED;
  DECLARE v_unit_price DECIMAL(12,2);
  DECLARE v_price_text VARCHAR(32);
  DECLARE v_product_name VARCHAR(160);
  DECLARE v_line_total DECIMAL(14,2);

  IF p_items IS NULL OR JSON_VALID(p_items) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La lista de productos no es JSON válido.';
  END IF;
  IF JSON_TYPE(JSON_EXTRACT(p_items, '$')) <> 'ARRAY' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta requiere una lista de productos.';
  END IF;
  SET v_count = JSON_LENGTH(p_items);
  IF v_count < 1 OR v_count > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta debe contener entre 1 y 100 líneas.';
  END IF;

  SET p_total = 0;
  INSERT INTO sales (total) VALUES (0);
  SET p_sale_id = LAST_INSERT_ID();

  WHILE v_index < v_count DO
    IF JSON_TYPE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].productId'))) <> 'INTEGER'
      OR JSON_TYPE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].quantity'))) <> 'INTEGER'
      OR JSON_TYPE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].unitPrice'))) <> 'STRING' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una línea de venta tiene un formato inválido.';
    END IF;

    SET v_product_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].productId'))) AS UNSIGNED);
    SET v_quantity = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].quantity'))) AS UNSIGNED);
    SET v_price_text = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].unitPrice')));
    IF v_product_id = 0 OR v_quantity < 1 OR v_quantity > 999
      OR v_price_text NOT REGEXP '^(0|[1-9][0-9]{0,5})([.][0-9]{1,2})?$' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una línea de venta contiene valores inválidos.';
    END IF;
    SET v_unit_price = CAST(v_price_text AS DECIMAL(12,2));
    IF v_unit_price <= 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El precio de venta debe ser mayor que cero.';
    END IF;

    SET v_product_name = NULL;
    SELECT name INTO v_product_name FROM products WHERE id = v_product_id LIMIT 1;
    IF v_product_name IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta contiene un producto inexistente.';
    END IF;

    SET v_line_total = v_unit_price * v_quantity;
    SET p_total = p_total + v_line_total;
    INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total)
      VALUES (p_sale_id, v_product_id, v_product_name, v_unit_price, v_quantity, v_line_total);
    SET v_index = v_index + 1;
  END WHILE;

  UPDATE sales SET total = p_total WHERE id = p_sale_id;
END$$
DELIMITER ;
