import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'pos_app',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_assessment'
});

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  return { status: response.status, body: await response.json() };
}

try {
  const barcode = `SMOKE-${Date.now()}`;
  const product = await request('/api/products', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Producto de prueba', barcode, price: '7.25' })
  });
  assert.equal(product.status, 201);
  assert.equal(product.body.price, '7.25');

  const byName = await request('/api/products?search=Producto%20de%20prueba');
  const byBarcode = await request(`/api/products?search=${barcode}`);
  assert.ok(byName.body.some(row => row.id === product.body.id));
  assert.ok(byBarcode.body.some(row => row.id === product.body.id));

  const duplicate = await request('/api/products', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Otro producto', barcode, price: '1.00' })
  });
  assert.equal(duplicate.status, 409);

  const sale = await request('/api/sales', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ productId: product.body.id, quantity: 2, unitPrice: '5.00' }] })
  });
  assert.equal(sale.status, 201);
  assert.equal(sale.body.total, '10.00');

  const [rows] = await connection.execute(
    'SELECT s.total, i.product_name, i.unit_price, i.quantity, i.line_total FROM sales s JOIN sale_items i ON i.sale_id = s.id WHERE s.id = ?',
    [sale.body.id]
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { total: '10.00', product_name: 'Producto de prueba', unit_price: '5.00', quantity: 2, line_total: '10.00' });

  const [[before]] = await connection.query('SELECT COUNT(*) AS count FROM sales');
  const invalid = await request('/api/sales', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [
      { productId: product.body.id, quantity: 1, unitPrice: '1.00' },
      { productId: 999999999, quantity: 1, unitPrice: '1.00' }
    ] })
  });
  assert.equal(invalid.status, 400);
  const [[after]] = await connection.query('SELECT COUNT(*) AS count FROM sales');
  assert.equal(after.count, before.count, 'Una venta inválida no debe dejar una cabecera parcial');
  console.log(`Smoke OK: producto ${product.body.id}, venta ${sale.body.id}, total ${sale.body.total}, rollback confirmado.`);
} finally {
  await connection.end();
}
