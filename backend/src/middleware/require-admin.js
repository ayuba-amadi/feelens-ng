const { findActiveAdminById } = require('../repositories/admin.repository');

function requireAdmin(pool) {
  return async function requireAdminMiddleware(req, res, next) {
    const adminUserId = req.session?.adminUserId;

    if (!adminUserId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    try {
      const admin = await findActiveAdminById(pool, adminUserId);

      if (!admin) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      req.admin = admin;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { requireAdmin };

