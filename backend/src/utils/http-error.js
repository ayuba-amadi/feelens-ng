class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

function notFound(label = 'Record') {
  return new HttpError(404, `${label} not found`);
}

function conflict(message) {
  return new HttpError(409, message);
}

module.exports = { HttpError, notFound, conflict };
