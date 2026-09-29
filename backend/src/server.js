require('dotenv').config();
const { createDatabase } = require('./infrastructure/database');
const { createProductRepository } = require('./infrastructure/productRepository');
const { createSaleRepository } = require('./infrastructure/saleRepository');
const { createProductsUseCases } = require('./application/products');
const { createSalesUseCases } = require('./application/sales');
const { createApp } = require('./http/app');

async function main() {
  const db = createDatabase({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME || 'pos_assessment',
    user: process.env.DB_USER || 'pos_app',
    password: process.env.DB_PASSWORD || ''
  });
  await db.sequelize.authenticate();
  const products = createProductsUseCases(createProductRepository(db.Product));
  const sales = createSalesUseCases(createSaleRepository(db.sequelize));
  const app = createApp({ products, sales });
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`POS disponible en http://localhost:${port}`));
}

main().catch(error => {
  console.error('No se pudo iniciar el POS:', error.message);
  process.exitCode = 1;
});
