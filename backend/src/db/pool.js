const { Pool } = require('pg');
const { loadEnv } = require('../config/env');
const { logDatabaseError } = require('../utils/database-errors');

let pool;

function buildSearchPath(schema = 'public') {
  return schema === 'public' ? 'public' : `${schema},public`;
}

function getPool(config = loadEnv()) {
  if (!pool) {
    pool = new Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      options: `-c search_path=${buildSearchPath(config.DB_SCHEMA)}`,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });

    pool.on('error', (error) => {
      logDatabaseError(error, 'pool');
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

module.exports = { getPool, closePool,
  buildSearchPath,
};

