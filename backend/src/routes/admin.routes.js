const express = require('express');
const { requireAdmin } = require('../middleware/require-admin');

const placeholderEndpoints = [
  'mdas',
  'services',
  'fees',
  'sources',
  'channels',
  'verifications',
  'foi',
  'audit-logs'
];

function createAdminRouter(pool) {
  const router = express.Router();
  router.use(requireAdmin(pool));

  router.get('/', (req, res) => {
    res.json({ status: 'ready', message: 'Admin API foundation.' });
  });

  for (const endpoint of placeholderEndpoints) {
    router.all(`/${endpoint}`, (req, res) => {
      res.status(200).json({
        status: 'placeholder',
        endpoint: `/admin/${endpoint}`,
        message: 'Management CRUD is planned for a later phase.'
      });
    });
  }

  return router;
}

module.exports = { createAdminRouter };

