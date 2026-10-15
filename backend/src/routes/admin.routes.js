const express = require('express');
const { requireAdmin } = require('../middleware/require-admin');
const { requireCsrf } = require('../middleware/require-csrf');
const { createContentRouter } = require('./admin/content.routes');
const { createDashboardRouter } = require('./admin/dashboard.routes');
const { createGovernanceRouter } = require('./admin/governance.routes');

function createAdminRouter(pool, options = {}) {
  const router = express.Router();
  router.use(options.adminMiddleware || requireAdmin(pool));
  router.use(options.csrfMiddleware || requireCsrf);

  router.get('/', (req, res) => {
    res.json({
      status: 'ready',
      user: {
        id: req.admin.id,
        displayName: req.admin.display_name,
        role: req.admin.role,
      },
    });
  });
  router.use('/dashboard', createDashboardRouter(pool));
  router.use(createContentRouter(pool));
  router.use(createGovernanceRouter(pool));

  return router;
}

module.exports = { createAdminRouter };

