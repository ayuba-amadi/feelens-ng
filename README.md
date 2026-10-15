# FeeLens NG

FeeLens NG is a civic-tech transparency platform that helps citizens and businesses check official government fees before they pay.

## Production Architecture

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js
- Database: PostgreSQL
- Hosting: Truehost cPanel / Apache
- Production domain: https://feelens.ng
- API: https://feelens.ng/api
- Source control: Git/GitHub

## Production Server

Frontend:
`/home/vgrphaph/public_html`

Backend:
`/home/vgrphaph/feelens-api`

Database:
`vgrphaph_feelens_prod`

## Security

Secrets must never be committed to Git.
Production database access is server-side only.
