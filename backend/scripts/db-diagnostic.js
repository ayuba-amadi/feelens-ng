// Read-only diagnostic; prints no environment values or database error messages.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const { classifyDatabaseError } = require('../src/utils/database-errors');
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
const schema = process.env.DB_SCHEMA || 'public';
if (missing.length || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  console.error(`Invalid configuration: ${[...missing, ...(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema) ? ['DB_SCHEMA'] : [])].join(', ')}`);
  process.exit(1);
}
const client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, connectionTimeoutMillis: 5000 });
(async () => {
  try {
    await client.connect();
    console.log('Database TCP and authentication: OK');
    const result = await client.query('SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1) AS present', [schema]);
    if (!result.rows[0].present) { console.error('Configured schema: unavailable or inaccessible'); process.exitCode = 1; }
    else console.log('Configured schema: visible');
  } catch (error) { console.error(`Database diagnostic: ${classifyDatabaseError(error)}`); process.exitCode = 1; }
  finally { await client.end().catch(() => {}); }
})();
