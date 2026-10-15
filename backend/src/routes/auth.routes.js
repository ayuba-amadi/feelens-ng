const crypto = require('node:crypto');
const express = require('express');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const {
  findActiveAdminById,
  findAdminByEmail,
  updateLastLogin
} = require('../repositories/admin.repository');
const {
  createCsrfToken,
  sessionDestroy,
  sessionRegenerate,
  sessionSave,
  tokensMatch
} = require('../utils/session-security');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256)
});

const dummyPasswordHashPromise = argon2.hash(crypto.randomBytes(32), {
  type: argon2.argon2id
});

function validationDetails(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: 'Invalid value.'
  }));
}

function createAuthRouter(pool) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid login request.',
        details: validationDetails(parsed.error)
      });
    }

    const { email, password } = parsed.data;

    try {
      const admin = await findAdminByEmail(pool, email);
      const passwordHash = admin?.password_hash || await dummyPasswordHashPromise;
      const passwordMatches = await argon2.verify(passwordHash, password);

      if (!admin || !admin.is_active || admin.role !== 'admin' || !passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      await sessionRegenerate(req.session);
      req.session.adminUserId = admin.id;
      req.session.csrfToken = createCsrfToken();
      await updateLastLogin(pool, admin.id);
      await sessionSave(req.session);

      return res.status(200).json({
        authenticated: true,
        user: {
          id: admin.id,
          email: admin.email,
          displayName: admin.display_name,
          role: admin.role
        },
        csrfToken: req.session.csrfToken
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      if (req.session?.adminUserId
        && !tokensMatch(req.session.csrfToken, req.get('x-csrf-token'))) {
        return res.status(403).json({ error: 'Invalid or missing CSRF token' });
      }

      if (req.session) {
        await sessionDestroy(req.session);
      }

      res.clearCookie('feelens.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/session', async (req, res, next) => {
    if (!req.session?.adminUserId) {
      return res.status(401).json({ authenticated: false });
    }

    try {
      const admin = await findActiveAdminById(pool, req.session.adminUserId);

      if (!admin) {
        await sessionDestroy(req.session);
        res.clearCookie('feelens.sid', { path: '/' });
        return res.status(401).json({ authenticated: false });
      }

      if (!req.session.csrfToken) {
        req.session.csrfToken = createCsrfToken();
        await sessionSave(req.session);
      }

      return res.status(200).json({
        authenticated: true,
        user: {
          id: admin.id,
          email: admin.email,
          displayName: admin.display_name,
          role: admin.role
        },
        csrfToken: req.session.csrfToken
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAuthRouter };

