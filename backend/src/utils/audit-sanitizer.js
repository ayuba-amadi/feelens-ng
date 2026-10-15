const BLOCKED_KEYS = /(password|password_hash|secret|session|token)/i;

function sanitizeAuditValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !BLOCKED_KEYS.test(key))
        .map(([key, item]) => [key, sanitizeAuditValue(item)]),
    );
  }

  return value;
}

module.exports = { sanitizeAuditValue };
