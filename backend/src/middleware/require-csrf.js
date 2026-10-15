const { tokensMatch } = require('../utils/session-security');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const supplied = req.get('x-csrf-token');
  if (!tokensMatch(req.session?.csrfToken, supplied)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  return next();
}

module.exports = { requireCsrf };
