const express = require('express');
const path = require('node:path');
const { UniqueConstraintError } = require('sequelize');
const { DomainError } = require('../domain/errors');

function createApp({ products, sales }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const route = handler => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/products', route(async (req, res) => {
    res.json(await products.search(req.query.search ?? ''));
  }));
  app.post('/api/products', route(async (req, res) => {
    res.status(201).json(await products.create(req.body));
  }));
  app.post('/api/sales', route(async (req, res) => {
    res.status(201).json(await sales.create(req.body));
  }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada.' }));
  const dist = path.resolve(__dirname, '../../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));

  app.use((error, req, res, next) => {
    if (error instanceof DomainError) {
      return res.status(error.status).json({ error: error.code, message: error.message });
    }
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({ error: 'DUPLICATE_BARCODE', message: 'Ya existe un producto con ese código de barras.' });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'INVALID_JSON', message: 'El JSON de la solicitud es inválido.' });
    }
    console.error(error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' });
  });
  return app;
}

module.exports = { createApp };
