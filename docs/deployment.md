# Deployment notes

This document is a preparation checklist only. Phase 1 does not deploy, connect to production, or modify the production site.

## Application layout

- Build the frontend with `npm run build` inside `frontend/` and publish only the generated static assets through the configured web server.
- Run the backend from its own Node.js application directory with Node.js 22 and an environment file managed outside Git.
- Mount the backend behind the web server at `/api`; the application itself uses route paths such as `/health` and `/auth/login` and does not hardcode a domain. The Apache rewrite/proxy must remove the external `/api` prefix before forwarding, so `/api/health` reaches the Node route `/health`.

## Apache reverse-proxy contract

- The Node process must not be exposed directly to the public internet.
- Apache must forward the original HTTPS scheme in `X-Forwarded-Proto` (and the client chain in `X-Forwarded-For`). The application trusts exactly one proxy hop in production with `app.set('trust proxy', 1)` and enables `express-session` proxy handling, which allows Secure cookies to be issued correctly behind the HTTPS proxy.
- Keep the proxy hop count aligned with the real topology. If another trusted proxy is inserted later, review this setting before deployment rather than broadly trusting arbitrary forwarded headers.

## PostgreSQL session storage

- `database/migrations/002_admin_auth.sql` explicitly creates the PostgreSQL 13-compatible `user_sessions` table (`sid`, `sess`, and `expire`) required by `connect-pg-simple`.
- `backend/src/server.js` uses that table with `createTableIfMissing: false`; it does not silently create or depend on an undeclared production table.
- Migration 002 must be applied, after migration 001, before enabling administrator login in any environment. The migration is not run automatically by the application and was not executed during Phase 1.

## Before a future deployment

1. Review migration order and take a recoverable database backup.
2. Provision a dedicated database role with only the required application privileges.
3. Set a long random `SESSION_SECRET` outside the repository.
4. Set `ALLOWED_ORIGINS` to the exact approved frontend origins.
5. Apply migrations through an approved, reviewed process. Do not run them from the browser or during an unreviewed cPanel upload.
6. Run `npm audit`, review dependency changes, and execute the backend tests and frontend production build.
7. Create the first administrator through `npm run admin:create` using its hidden interactive password prompt; do not pass a password as a command-line argument and do not use default credentials. A temporary `ADMIN_PASSWORD` environment value is supported only as a fallback, can be exposed through shell/process environment inspection, and must be unset immediately after use.
8. Verify HTTPS, secure cookies, error responses, session logout, database connectivity, and log redaction.

## Operational constraints

- PostgreSQL credentials and session secrets must remain server-side.
- Do not print environment values or connection strings in logs.
- Do not deploy unverified service, MDA, or fee data.
- Do not imply government endorsement in application copy, branding, or UI.

