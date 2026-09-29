const { DomainError } = require('../domain/errors');

function createSaleRepository(sequelize) {
  return {
    async create(items) {
      return sequelize.transaction(async transaction => {
        try {
          await sequelize.query('CALL sp_register_sale(:items, @pos_sale_id, @pos_sale_total)', {
            replacements: { items: JSON.stringify(items) }, transaction
          });
          const [rows] = await sequelize.query('SELECT @pos_sale_id AS id, @pos_sale_total AS total', { transaction });
          return { id: Number(rows[0].id), total: rows[0].total, itemCount: items.length };
        } catch (error) {
          if (error.original?.sqlState === '45000') {
            throw new DomainError(error.original.sqlMessage || 'La venta es inválida.');
          }
          throw error;
        }
      });
    }
  };
}

module.exports = { createSaleRepository };
