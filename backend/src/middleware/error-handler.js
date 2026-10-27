const { logDatabaseError } = require('../utils/database-errors');

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request.' });
  }

  const status = Number.isInteger(error?.statusCode)
    ? error.statusCode
    : (Number.isInteger(error?.status) ? error.status : 500);
  const safeMessage = status >= 500 ? 'Internal server error.' : (error.message || 'Request failed.');

  if (status >= 500) {
    if (error?.code) logDatabaseError(error, 'request');
    else console.error('Unhandled application error.');
  }

  const response = { error: safeMessage };
  if (status < 500 && error?.details) response.details = error.details;
  return res.status(status).json(response);
}

module.exports = { errorHandler };

