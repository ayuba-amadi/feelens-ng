# FeeLens NG architecture

FeeLens NG is an independent civic-tech transparency platform. It is not a government platform, payment processor, application portal, agent, or middleman.

```text
Browser
  |
  +--> React/Tailwind public frontend
  |
  +--> protected React/Tailwind admin interface
             |
             v
           /api
             |
        Node/Express
             |
        PostgreSQL
```

## Boundaries

- The browser never connects directly to PostgreSQL.
- Public users require no login and consume only read-only public API functionality.
- Administrator functionality is served through the same backend API and requires an authenticated HTTP-only server-side session.
- Sessions are stored in PostgreSQL through `connect-pg-simple` in a production-like environment.
- Management changes are accompanied by audit-log records containing the authenticated actor, action, entity, and sanitised before/after values.
- Public pages never receive internal notes, administrator identities, FOI workflow details, audit history or editing controls.

## Administration architecture

The React administration application uses the same-origin API and browser cookie session. It does not store an access token in `localStorage`. On startup it checks `GET /auth/session`; unauthenticated users are redirected to `/admin/login`, while authenticated users receive a session-bound CSRF token for state-changing requests.

All administration data routes pass through:

1. session middleware backed by the declared `user_sessions` table;
2. active-administrator lookup on the server;
3. CSRF validation for unsafe HTTP methods;
4. Zod input validation;
5. parameterized repository/route queries;
6. central safe error handling.

Major lists use bounded server-side pagination and allowlisted sort columns. Multi-step fee supersession, verification and audited mutations use PostgreSQL transactions. Records with historical value are disabled, made non-current or superseded rather than casually deleted.

## Data history

- A service remains distinct from its fee options.
- Fee options support fixed, free, range, percentage, formula, variable and unknown models.
- Unknown never means zero, and conflicting evidence is retained rather than silently resolved.
- `fee_sources` links reusable evidence to fees without duplicating source records.
- Verification events record reviewer identity from the authenticated session and are read-only in the UI.
- Audit records are read-only in the UI and exclude credential/session material.

## Repository layout

- `frontend/` — React/Vite/Tailwind/React Router public and protected administration applications.
- `backend/` — Node/Express API, authentication, CMS routes, database access, validation and tests.
- `database/` — base schema, authentication/session schema and non-destructive Phase 3 CMS support migration.
- `docs/` — architecture and deployment notes.
- `research/` — evidence and verification methodology.

