// Only allowlisted classifications are logged: database error messages can contain secrets.
function classifyDatabaseError(error) {
  const code = error?.code;
  if (code === '28P01') return 'authentication failure';
  if (code === '3D000') return 'database not found';
  if (code === 'ECONNREFUSED') return 'connection refused';
  if (['ETIMEDOUT', 'ECONNRESET', '57014'].includes(code) || /timeout|timed out/i.test(error?.message || '')) return 'connection timeout';
  if (code === '3F000' || code === '42P01') return 'schema or relation problem';
  if (code === '42501') return 'permission problem';
  return 'unclassified database error';
}
function logDatabaseError(error, context) {
  console.error(`Database ${context}: ${classifyDatabaseError(error)}.`);
}
module.exports = { classifyDatabaseError, logDatabaseError };
