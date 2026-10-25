# FeeLens Sentry monitoring

FeeLens uses two Sentry projects:

- `feelens-web` for the React/Vite frontend
- `feelens-api` for the Node/Express backend

## Environment variables

Set these values only in the appropriate local, hosting, or CI environment. Do not commit their values.

```dotenv
# frontend runtime/build environment
VITE_SENTRY_DSN=
VITE_SENTRY_RELEASE=

# backend runtime environment
SENTRY_DSN=
SENTRY_RELEASE=
```

Frontend source-map upload is optional and build/CI-only. If enabled, provide the following only to the build environment:

```dotenv
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

`SENTRY_AUTH_TOKEN` must never be exposed to the browser, included in client-side code, or committed. The Vite plugin activates source-map upload only when all three build variables are present. Uploaded source maps are removed from the build output after upload. Normal builds do not emit source maps or require a Sentry token.

## Runtime protections

Both SDKs use the production environment, `sendDefaultPii: false`, and conservative 5% transaction sampling. Session Replay is disabled. Event filtering removes user objects, request bodies, cookies, query strings, and fields containing authorization, cookie, password, token, secret, database-password, or session-secret values.

The backend initializes Sentry before creating the database pool or Express application. Its existing safe error responses and middleware ordering remain unchanged. The frontend uses Sentry's React error boundary without exposing exception details to users.

Release identifiers can be supplied by `VITE_SENTRY_RELEASE` and `SENTRY_RELEASE`. They are optional; the application does not require Git to be installed at runtime.

## Safe verification

The repository includes a unit test for the event sanitizer at `backend/tests/sentry.test.js`. Run it with the normal backend test suite; it does not send an event or create a public error endpoint.

To verify delivery, use a local or staging environment with a test DSN and trigger an exception from an authorized local-only test harness. Do not add an unauthenticated production debug route, and do not put a DSN or auth token in source control.
