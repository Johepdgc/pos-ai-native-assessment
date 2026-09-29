const { DomainError } = require('./errors');
const { priceToCents } = require('./product');

function normalizeSale(input) {
  if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw new DomainError('La venta debe contener entre 1 y 100 líneas.');
  }
  return input.items.map((item, index) => {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      throw new DomainError(`El producto de la línea ${index + 1} es inválido.`);
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new DomainError(`La cantidad de la línea ${index + 1} debe estar entre 1 y 999.`);
    }
    const unitPrice = (priceToCents(item?.unitPrice) / 100).toFixed(2);
    return { productId, quantity, unitPrice };
  });
}

module.exports = { normalizeSale };
