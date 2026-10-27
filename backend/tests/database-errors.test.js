const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyDatabaseError, logDatabaseError } = require('../src/utils/database-errors');

test('database diagnostics classify common failures without logging raw messages', () => {
  const cases = [['28P01', 'authentication failure'], ['3D000', 'database not found'], ['ECONNREFUSED', 'connection refused'], ['ETIMEDOUT', 'connection timeout'], ['3F000', 'schema or relation problem'], ['42501', 'permission problem']];
  for (const [code, expected] of cases) assert.equal(classifyDatabaseError({ code }), expected);
  const original = console.error; let output = '';
  try { console.error = (line) => { output += line; }; logDatabaseError({ code: '28P01', message: 'DB_PASSWORD=secret SESSION_SECRET=secret' }, 'health check'); }
  finally { console.error = original; }
  assert.match(output, /authentication failure/);
  assert.doesNotMatch(output, /secret|DB_PASSWORD|SESSION_SECRET/i);
});
