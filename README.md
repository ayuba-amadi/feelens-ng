# FeeLens NG

FeeLens NG is independent civic technology that helps citizens and businesses answer: “What is the official fee before I pay?” It is not a government platform, payment processor, application portal, agent, or middleman.

## Applications

- `frontend/` — React, Vite, Tailwind CSS, React Router and Lucide public/admin interfaces.
- `backend/` — Node.js 22, Express and PostgreSQL API with server-side administrator sessions.
- `database/` — reviewed PostgreSQL 13-compatible migrations; migrations are never run automatically.
- `research/` — FeeLens evidence and verification methodology.
- `docs/` — architecture, deployment preparation and administration guidance.

The public site is read-only and requires no citizen account. The administration application under `/admin` requires a previously provisioned administrator account. There is no public registration endpoint.

## Local development

Copy each `.env.example` to a local, ignored `.env` only when needed. Use isolated local database credentials and never reuse production secrets.

```text
frontend: npm install && npm run dev
backend:  npm install && npm run dev
```

Validation commands:

```text
frontend: npm run lint && npm run build
backend:  npm run lint && npm test
root:     git diff --check
```

The Phase 3 CMS supports MDAs, services, fee options and supersession, sources, evidence links, official channels, verification history, formal requests, administrators, accounts and read-only audit history. See `docs/admin-guide.md` for workflows.

## Security

Never commit secrets, administrator passwords or a real `.env`. PostgreSQL remains server-side only. Review `SECURITY.md` and `docs/deployment.md` before any production work.
