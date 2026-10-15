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
- Public users require no login and consume public API functionality when it is added in later phases.
- Administrator functionality is served through the same backend API and requires an authenticated HTTP-only server-side session.
- Sessions are stored in PostgreSQL through `connect-pg-simple` in a production-like environment.
- Management changes will be accompanied by audit-log records containing the actor, action, entity, and before/after values.
- Phase 1 contains the schema and route foundation; it does not implement full management CRUD or the final public UI.

## Repository layout

- `frontend/` — React/Vite/Tailwind/React Router placeholder application.
- `backend/` — lightweight Node/Express API, authentication foundation, database access, and tests.
- `database/` — PostgreSQL migrations representing the existing schema and admin authentication tables.
- `docs/` — architecture and deployment notes.
- `research/` — evidence and verification methodology.

