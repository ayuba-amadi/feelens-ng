# Security

FeeLens NG is an independent civic-tech transparency platform. It is not a government platform and must not imply government endorsement.

## Rules

- Never commit secrets, local `.env` files, private keys, database passwords, session secrets, or administrator passwords.
- The production PostgreSQL database is server-side only. Browsers must never connect to it directly.
- Public citizens do not need accounts. Administrator routes require an authenticated server-side session.
- Administrator passwords are stored only as Argon2id password hashes.
- Login uses HTTP-only, SameSite cookies; cookies are Secure in production.
- Use parameterized SQL for every database query.
- Review dependencies and lockfile changes before any production deployment.
- Do not place real government, MDA, service, or fee records in development fixtures unless they have been intentionally sourced and reviewed.

## Vulnerability reporting

Report suspected vulnerabilities privately to the project maintainers with reproduction steps, affected versions, and impact. Do not disclose credentials, personal data, or an exploitable proof publicly before the maintainers have had a reasonable opportunity to respond.

