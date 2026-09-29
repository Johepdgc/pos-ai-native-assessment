const { Sequelize, DataTypes } = require('sequelize');

function createDatabase(config) {
  const sequelize = new Sequelize(config.name, config.user, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 10000 }
  });

  const Product = sequelize.define('Product', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(160), allowNull: false },
    barcode: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
  }, { tableName: 'products', underscored: true, updatedAt: false });

  return { sequelize, Product };
}

module.exports = { createDatabase };
