# Security

FeeLens NG is an independent civic-tech transparency platform. It is not a government platform and must not imply government endorsement.

## Rules

- Never commit secrets, local `.env` files, private keys, database passwords, session secrets, or administrator passwords.
- The production PostgreSQL database is server-side only. Browsers must never connect to it directly.
- Public citizens do not need accounts. Administrator routes require an authenticated server-side session.
- Administrator passwords are stored only as Argon2id password hashes.
- Login uses rotating, HTTP-only, SameSite=Lax session cookies with an eight-hour maximum age; cookies are Secure in production.
- Production runs behind one explicitly trusted Apache proxy hop. Review the hop count if hosting topology changes.
- State-changing administration requests require a synchronizer CSRF token held in the server session and sent in a custom request header. Tokens are kept in memory by the frontend, not local storage.
- Login failure messages do not reveal whether an email address exists, and login has a stronger rate limit.
- Administrator sessions are stored in the declared PostgreSQL `user_sessions` table; the application does not silently create it.
- Use parameterized SQL for every database query.
- Dynamic sort values must come from server-side allowlists.
- Important content mutations and administrator changes must write audit records in the same transaction where practical.
- Passwords, password hashes, sessions, CSRF tokens and secrets must never be returned by management APIs or written to audit JSON.
- Review dependencies and lockfile changes before any production deployment.
- Do not place real government, MDA, service, or fee records in development fixtures unless they have been intentionally sourced and reviewed.

## Vulnerability reporting

Report suspected vulnerabilities privately to the project maintainers with reproduction steps, affected versions, and impact. Do not disclose credentials, personal data, or an exploitable proof publicly before the maintainers have had a reasonable opportunity to respond.

## Administration review checklist

- Confirm there is no public registration route.
- Confirm all `/admin` API routes pass through session authentication and CSRF protection.
- Confirm at least one active administrator remains before deactivating accounts.
- Use the fee supersession workflow instead of overwriting historical official amounts.
- Treat verification and audit history as append-only through normal UI workflows.
- Review dependency advisories, reverse-proxy headers, cookie delivery and database backup/restore before deployment.

