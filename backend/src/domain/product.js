const { DomainError } = require('./errors');

function priceToCents(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,5})(?:\.\d{1,2})?$/.test(text)) {
    throw new DomainError('El precio debe estar entre 0.01 y 999999.99, con hasta dos decimales.');
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new DomainError('El precio debe ser mayor que cero.');
  }
  return cents;
}

function normalizeProduct(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DomainError('Los datos del producto son inválidos.');
  }
  const name = String(input.name ?? '').trim();
  const barcode = String(input.barcode ?? '').trim();
  if (name.length < 2 || name.length > 160) {
    throw new DomainError('El nombre debe tener entre 2 y 160 caracteres.');
  }
  if (!/^[A-Za-z0-9._-]{3,80}$/.test(barcode)) {
    throw new DomainError('El código de barras debe tener entre 3 y 80 caracteres válidos.');
  }
  const priceCents = priceToCents(input.price);
  return { name, barcode, price: (priceCents / 100).toFixed(2) };
}

module.exports = { normalizeProduct, priceToCents };
