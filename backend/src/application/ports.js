/**
 * @typedef {Object} ProductRepository
 * @property {(product: {name: string, barcode: string, price: string}) => Promise<Object>} create
 * @property {(term: string) => Promise<Object[]>} search
 */

/**
 * @typedef {Object} SaleRepository
 * @property {(items: {productId: number, quantity: number, unitPrice: string}[]) => Promise<{id: number, total: string, itemCount: number}>} create
 */

module.exports = {};
