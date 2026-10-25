const Sentry = require('@sentry/node');

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|setcookie|password|token|secret|dbpassword|sessionsecret)/i;

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key.replace(/[-_]/g, '')))
      .map(([key, childValue]) => [key, sanitizeValue(childValue)]),
  );
}

function sanitizeSentryEvent(event) {
  const sanitized = sanitizeValue(event);

  if (sanitized && typeof sanitized === 'object') {
    delete sanitized.user;

    if (sanitized.request && typeof sanitized.request === 'object') {
      delete sanitized.request.data;
      delete sanitized.request.body;
      delete sanitized.request.form;
      delete sanitized.request.files;
      delete sanitized.request.cookies;
      delete sanitized.request.query_string;
    }
  }

  return sanitized;
}

function initSentry(config) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: 'production',
    release: config.SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.05 : 0,
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: sanitizeSentryEvent,
  });
}

module.exports = { initSentry, sanitizeSentryEvent };
