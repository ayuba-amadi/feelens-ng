const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSearchPath } = require('../src/db/pool');

test('public schema uses only the public search path', () => {
  assert.equal(buildSearchPath('public'), 'public');
});

test('application schema is searched before public', () => {
  assert.equal(
    buildSearchPath('feelens_app'),
    'feelens_app,public',
  );
});

test('undefined schema safely defaults to public', () => {
  assert.equal(buildSearchPath(), 'public');
});
