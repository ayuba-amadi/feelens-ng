# Deployment notes

This document is a preparation checklist only. Phase 3 does not deploy, connect to production, run migrations, or modify the production site.

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

## Phase 3 migration

`database/migrations/003_admin_cms_support.sql` adds only CMS support columns, constraints and indexes. It preserves existing records and is PostgreSQL 13 compatible. It must be reviewed and run once through an approved migration process after migrations 001 and 002. The application does not run it at startup.

Before applying it later:

1. take and verify a recoverable PostgreSQL backup;
2. confirm migrations 001 and 002 already match the target database;
3. review every new column and constraint against the current schema;
4. apply migration 003 in a controlled maintenance window;
5. verify the transaction completed and inspect the new constraints/indexes;
6. restore from backup if validation fails rather than editing historical migrations.

## Before a future deployment

1. Review migration order and take a recoverable database backup.
2. Provision a dedicated database role with only the required application privileges.
3. Set a long random `SESSION_SECRET` outside the repository.
4. Set `ALLOWED_ORIGINS` to the exact approved frontend origins.
5. Apply migrations 001, 002 and 003 as appropriate through an approved, reviewed process. Do not run them from the browser or during an unreviewed cPanel upload.
6. Install locked backend/frontend dependencies in their respective directories and review dependency changes/advisories.
7. Run backend tests/syntax checks and build the frontend with `npm run build`; publish only reviewed `frontend/dist` assets.
8. Configure cPanel environment variables from `backend/.env.example` without putting secrets in the repository or public web root.
9. Restart the cPanel Node.js application after backend code or environment changes; do not rely on a frontend upload to restart Node.
10. Create the first administrator through `npm run admin:create` using its hidden interactive password prompt; do not pass a password as a command-line argument and do not use default credentials. A temporary `ADMIN_PASSWORD` environment value is supported only as a fallback, may be exposed through environment inspection, and must be unset immediately after use.
11. Verify HTTPS, Apache forwarding headers, secure cookie delivery, CSRF handling, login/logout/session expiry, database connectivity, audit writes and log redaction.

## Required server configuration

- `NODE_ENV=production`
- an application port managed by cPanel
- server-only PostgreSQL host/port/name/user/password
- exact approved browser origins in `ALLOWED_ORIGINS`
- a long random `SESSION_SECRET`

Do not put these values in source control. Apache must forward `/api/*` to Node after removing the `/api` prefix, and must preserve the original HTTPS scheme. The app trusts exactly one proxy hop in production so Express can issue Secure cookies behind Apache.

## Operational constraints

- PostgreSQL credentials and session secrets must remain server-side.
- Do not print environment values or connection strings in logs.
- Do not deploy unverified service, MDA, or fee data.
- Do not imply government endorsement in application copy, branding, or UI.


## Current production checks and credential drift recovery

Run checks from their own package directories, not the repository root: `cd backend && npm test && npm run lint`; separately `cd frontend && npm run lint && npm run build`. These commands do not require Python or ripgrep on the cPanel host.

From `backend/`, run `node scripts/production-smoke-check.js https://feelens.ng` to check the five public endpoints. A non-200 response, timeout or network failure produces a nonzero exit. Run `node scripts/db-diagnostic.js` in the application environment to check required DB configuration, TCP/authentication and schema visibility without printing credentials. It does not write data. The schema check confirms visibility, not every table or permission.

For a suspected `28P01` incident, first confirm the configured application's existing credential is available securely to an authorized operator, identify the intended PostgreSQL role and check TCP separately. Compare configuration and role state without displaying or copying secrets into logs, shell history, tickets or chat. If drift is confirmed, an authorized cPanel operator can use UAPI `Postgresql::set_password` to synchronize the role to the existing application credential through a secure operator-controlled mechanism. Do not place passwords in command arguments or logs. Coordinate any change, preserve the existing application credential, and do not change unrelated roles. Then run the DB diagnostic and smoke check, verify application login and public counts, and review monitoring. If unable to safely access the credential or UAPI, stop and involve the hosting administrator. This procedure is incident guidance, not authorization to change credentials.

Serve fingerprinted `dist/assets/` with long-lived immutable caching, and HTML with revalidation; verify actual Apache headers before enabling the policy. Keep a rollback copy of the previous frontend and backend release. No migrations are needed for this refinement.

## Rollback for this release

Before release, retain the exact currently deployed frontend files and backend code and record the release paths. If validation fails after an authorized release, restore those previous files, restart the Node application through the normal operator procedure when backend code was changed, and rerun the read-only smoke checks, admin login verification and monitoring review. Escalate persistent database failures without changing credentials or roles as part of the rollback. No schema migration is involved in this release.
