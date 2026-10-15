const { Pool } = require('pg');
const { loadEnv } = require('../config/env');

let pool;

function getPool(config = loadEnv()) {
  if (!pool) {
    pool = new Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });

    pool.on('error', () => {
      console.error('Unexpected database pool error.');
    });
  }

  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPool, closePool };

