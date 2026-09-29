const { normalizeSale } = require('../domain/sale');

/** @param {import('./ports').SaleRepository} sales */
function createSalesUseCases(sales) {
  return {
    async create(input) {
      return sales.create(normalizeSale(input));
    }
  };
}

module.exports = { createSalesUseCases };
