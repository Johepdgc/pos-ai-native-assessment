const { DomainError } = require('../domain/errors');
const { normalizeProduct } = require('../domain/product');

function createProductsUseCases(products) {
  return {
    async create(input) {
      const product = normalizeProduct(input);
      return products.create(product);
    },
    async search(term) {
      if (typeof term !== 'string' || term.length > 160) {
        throw new DomainError('La búsqueda es inválida.');
      }
      return products.search(term.trim());
    }
  };
}

module.exports = { createProductsUseCases };
