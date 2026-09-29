const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProduct } = require('../src/domain/product');
const { normalizeSale } = require('../src/domain/sale');

test('el precio conserva dos decimales y el barcode se limpia', () => {
  assert.deepEqual(normalizeProduct({ name: ' Café ', barcode: ' CA-01 ', price: '5.2' }), {
    name: 'Café', barcode: 'CA-01', price: '5.20'
  });
});

test('se rechazan precios imprecisos y códigos de barras inválidos', () => {
  assert.throws(() => normalizeProduct({ name: 'Café', barcode: 'ABC', price: '1.005' }));
  assert.throws(() => normalizeProduct({ name: 'Café', barcode: '!', price: '1.00' }));
});

test('una venta requiere líneas válidas y permite precio modificado', () => {
  assert.deepEqual(normalizeSale({ items: [{ productId: 1, quantity: 2, unitPrice: '4.5' }] }), [
    { productId: 1, quantity: 2, unitPrice: '4.50' }
  ]);
  assert.throws(() => normalizeSale({ items: [] }));
  assert.throws(() => normalizeSale({ items: [{ productId: 1, quantity: 0, unitPrice: '4.5' }] }));
});
