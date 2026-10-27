const express = require('express');
const { logDatabaseError } = require('../utils/database-errors');

function createHealthRouter(pool) {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  router.get('/db-health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      logDatabaseError(error, 'health check');
      return res.status(503).json({
        status: 'unavailable',
        error: 'Database unavailable.'
      });
    }
  });

  return router;
}

module.exports = { createHealthRouter };

