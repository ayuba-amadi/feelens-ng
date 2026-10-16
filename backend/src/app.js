const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const { createHealthRouter } = require('./routes/health.routes');
const { createAuthRouter } = require('./routes/auth.routes');
const { createAdminRouter } = require('./routes/admin.routes');
const { createPublicRouter } = require('./routes/public.routes');
const { notFound } = require('./middleware/not-found');
const { errorHandler } = require('./middleware/error-handler');

function normalizeApiMountPath(req, _res, next) {
  if (req.url === '/api') {
    req.url = '/';
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4);
  }

  next();
}

function createApp({ config, pool, sessionStore, adminMiddleware, csrfMiddleware } = {}) {
  if (!config || !pool) {
    throw new Error('Application configuration and database pool are required.');
  }

  const app = express();

  // cPanel exposes this application under /api while preserving the prefix.
  // Normalize it before route matching; root paths remain valid for local/tests.
  app.use(normalizeApiMountPath);
  app.disable('x-powered-by');

  if (config.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  }));
  app.use(session({
    name: 'feelens.sid',
    secret: config.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: config.NODE_ENV === 'production',
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    }
  }));

  app.use(createHealthRouter(pool));
  app.use('/public', createPublicRouter(pool));
  app.use('/auth', createAuthRouter(pool));
  app.use('/admin', createAdminRouter(pool, { adminMiddleware, csrfMiddleware }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, normalizeApiMountPath };

