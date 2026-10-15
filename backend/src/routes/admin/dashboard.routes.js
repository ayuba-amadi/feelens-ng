const express = require('express');

function createDashboardRouter(pool) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const [countsResult, activityResult] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM mdas) AS "totalMdas",
            (SELECT COUNT(*)::int FROM mdas WHERE is_active) AS "activeMdas",
            (SELECT COUNT(*)::int FROM services) AS "totalServices",
            (SELECT COUNT(*)::int FROM services WHERE is_active) AS "activeServices",
            (SELECT COUNT(*)::int FROM fee_options) AS "feeOptions",
            (SELECT COUNT(*)::int FROM fee_options WHERE verification_status = 'verified' AND is_current) AS "verifiedFeeItems",
            (SELECT COUNT(*)::int FROM fee_options WHERE verification_status = 'pending' AND is_current) AS "pendingFeeItems",
            (SELECT COUNT(*)::int FROM fee_options WHERE verification_status = 'conflicting' AND is_current) AS "conflictingFeeItems",
            (SELECT COUNT(*)::int FROM fee_options WHERE verification_status = 'unable_to_verify' AND is_current) AS "unableToVerifyItems",
            (SELECT COUNT(*)::int FROM sources) AS "sources",
            (SELECT COUNT(*)::int FROM foi_requests WHERE status NOT IN ('closed', 'withdrawn')) AS "openFoiRequests"
        `),
        pool.query(`
          SELECT ve.id, ve.status, ve.checked_at AS "checkedAt",
                 ve.evidence_summary AS "evidenceSummary", s.name AS "serviceName",
                 m.name AS "mdaName", au.display_name AS "reviewerName"
            FROM verification_events ve
            JOIN services s ON s.id = ve.service_id
            JOIN mdas m ON m.id = s.mda_id
            LEFT JOIN admin_users au ON au.id = ve.actor_admin_user_id
           ORDER BY ve.checked_at DESC
           LIMIT 8
        `),
      ]);

      res.json({
        counts: countsResult.rows[0],
        recentVerificationActivity: activityResult.rows,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createDashboardRouter };
