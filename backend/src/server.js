const expressSession = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { createApp } = require('./app');
const { loadEnv } = require('./config/env');
const { getPool, closePool } = require('./db/pool');

async function startServer() {
  const config = loadEnv();
  const pool = getPool(config);
  const PgSession = connectPgSimple(expressSession);
  const sessionStore = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: false
  });
  const app = createApp({ config, pool, sessionStore });
  const server = app.listen(config.PORT, () => {
    console.log(`FeeLens API listening on port ${config.PORT}.`);
  });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(() => {
  console.error('Unable to start FeeLens API. Check the server configuration.');
  process.exitCode = 1;
});

