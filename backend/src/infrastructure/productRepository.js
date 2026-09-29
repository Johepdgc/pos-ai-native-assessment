const { Op } = require('sequelize');

function toPlain(model) {
  const row = model.get({ plain: true });
  return { id: Number(row.id), name: row.name, barcode: row.barcode, price: row.price };
}

function createProductRepository(Product) {
  return {
    async create(data) {
      return toPlain(await Product.create(data));
    },
    async search(term) {
      const escaped = term.replace(/[\\%_]/g, '\\$&');
      const where = term ? { [Op.or]: [
        { name: { [Op.like]: `%${escaped}%` } },
        { barcode: { [Op.like]: `%${escaped}%` } }
      ] } : {};
      return (await Product.findAll({ where, order: [['name', 'ASC']], limit: 30 })).map(toPlain);
    }
  };
}

module.exports = { createProductRepository };
