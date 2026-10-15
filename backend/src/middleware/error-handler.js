function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request.' });
  }

  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const safeMessage = status >= 500 ? 'Internal server error.' : (error.message || 'Request failed.');

  if (status >= 500) {
    console.error('Unhandled application error.');
  }

  return res.status(status).json({ error: safeMessage });
}

module.exports = { errorHandler };

