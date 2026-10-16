const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeApiMountPath } = require('../src/app');

function normalize(url) {
  const req = { url };
  let nextCalled = false;

  normalizeApiMountPath(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  return req.url;
}

test('cPanel /api prefix is removed before Express route matching', () => {
  assert.equal(normalize('/api/health'), '/health');
});

test('cPanel /api prefix preserves query strings', () => {
  assert.equal(
    normalize('/api/public/mdas?page=1&pageSize=5'),
    '/public/mdas?page=1&pageSize=5',
  );
});

test('bare /api becomes application root', () => {
  assert.equal(normalize('/api'), '/');
});

test('ordinary application paths remain unchanged', () => {
  assert.equal(normalize('/public/stats'), '/public/stats');
});
