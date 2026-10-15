const { randomBytes, timingSafeEqual } = require('node:crypto');

function createCsrfToken() {
  return randomBytes(32).toString('hex');
}

function tokensMatch(expected, supplied) {
  if (typeof expected !== 'string' || typeof supplied !== 'string') return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function sessionRegenerate(session) {
  return new Promise((resolve, reject) => {
    session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function sessionSave(session) {
  return new Promise((resolve, reject) => {
    session.save((error) => (error ? reject(error) : resolve()));
  });
}

function sessionDestroy(session) {
  return new Promise((resolve, reject) => {
    session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = {
  createCsrfToken,
  sessionDestroy,
  sessionRegenerate,
  sessionSave,
  tokensMatch,
};
