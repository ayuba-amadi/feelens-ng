const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeSentryEvent } = require('../src/monitoring/sentry');

test('Sentry event sanitization removes credentials and request bodies', () => {
  const sanitized = sanitizeSentryEvent({
    user: { id: 'user-123' },
    request: {
      headers: {
        authorization: 'Bearer secret',
        cookie: 'session=secret',
        'set-cookie': 'session=secret',
        'x-safe': 'retained',
      },
      data: { password: 'secret' },
      body: { password: 'secret' },
      form: { token: 'secret' },
      files: [{ secret: 'secret' }],
      cookies: { session: 'secret' },
      query_string: 'token=secret',
    },
    extra: {
      DB_PASSWORD: 'secret',
      SESSION_SECRET: 'secret',
      nested: { token: 'secret', safe: 'retained' },
    },
  });

  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.request.headers.authorization, undefined);
  assert.equal(sanitized.request.headers.cookie, undefined);
  assert.equal(sanitized.request.headers['set-cookie'], undefined);
  assert.equal(sanitized.request.headers['x-safe'], 'retained');
  assert.equal(sanitized.request.data, undefined);
  assert.equal(sanitized.request.body, undefined);
  assert.equal(sanitized.request.form, undefined);
  assert.equal(sanitized.request.files, undefined);
  assert.equal(sanitized.request.cookies, undefined);
  assert.equal(sanitized.request.query_string, undefined);
  assert.equal(sanitized.extra.DB_PASSWORD, undefined);
  assert.equal(sanitized.extra.SESSION_SECRET, undefined);
  assert.equal(sanitized.extra.nested.token, undefined);
  assert.equal(sanitized.extra.nested.safe, 'retained');
});
