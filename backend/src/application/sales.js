const { normalizeSale } = require('../domain/sale');

function createSalesUseCases(sales) {
  return {
    async create(input) {
      return sales.create(normalizeSale(input));
    }
  };
}

module.exports = { createSalesUseCases };
