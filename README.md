# Sombetini Primary School

Public website and school office system for Sombetini Primary School, Arusha. Parents, teachers, and administrators share one sign-in. Results and fees are visible only to a parent whose link to that pupil has been approved by the office. Fee collection uses a control number; a live payment gateway can be connected later.

## Included

- Public pages: home, about, academics, school life, news, events, examinations, results check, documents, gallery, contact, terms, privacy, and search
- Parent portal: child claims, approved results, report cards, control numbers, announcements
- Teacher portal: assigned classes, mark entry, draft save, submission for approval
- Administration office: academic years, classes, subjects, teachers, charges, notices, pending child claims, audit log
- API: NestJS at `/api/v1`, JWT in httpOnly cookies, role checks on the server. Swagger at `/api/docs`
- PostgreSQL (Prisma), Redis, file uploads, nightly database backups

## Layout

```
backend/     API, Prisma schema, migrations, seed
frontend/    Next.js site and portals
docker/      Nginx and Postgres init
scripts/     Backup, restore, and load-test helpers
```

## Local setup

Node.js 20+ and Docker.

```powershell
copy .env.example .env
docker compose up -d postgres redis
cd backend
npm install
npx prisma generate
npm run db:migrate:deploy
npx prisma db seed
npm run start:dev
```

In a second terminal:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

- Site: http://localhost:3000
- API docs: http://localhost:4000/api/docs

From the repository root, `npm install` installs both workspaces. `npm run dev` starts the API and the site after Postgres and Redis are up. `npm run db:migrate:deploy` applies pending migrations (same command works inside `backend`).

## First sign-in

The database starts empty of pupils, parents, teachers, marks, fees, and notices. Create the first administrator once via `POST /api/v1/auth/setup` while setup is still open, then sign in at http://localhost:3000/portal/admin.

The office enters academic years, classes, subjects, teachers, charges, and notices. Parents register themselves from the parent login page and claim children by registration number. A claim stays pending until the office approves it under Pending child claims. Pupils do not have their own accounts. Results and fees stay closed until the claim is approved.

To wipe loaded school data and keep the administrator account:

```powershell
cd backend
npm run prisma:clear
```

## Configuration

Copy `.env.example` to `.env` at the repository root and to `backend/.env` for the API. Replace `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and the database password before any shared deployment. The API refuses to start in production with the example database password.

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Password reset, parent email confirmation, contact-form copies, notices. Password reset stays disabled until SMTP is set. |
| `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_API_SECRET`, `SMS_SENDER_ID` | Optional SMS (`beem`, `africastalking`, or `twilio`). Leave `SMS_PROVIDER` empty until an account exists. |
| `PAYMENT_PROVIDER`, gateway keys, `PAYMENT_WEBHOOK_SECRET` | Default `mock` issues a control number and does not mark a payment paid. A paid status is recorded only after the gateway reports it, or an administrator confirms a receipt. |
| `PUBLIC_API_URL`, `FRONTEND_URL`, `CORS_ORIGINS` | Public origin of the site. Use the HTTPS origin in production. |
| `METRICS_TOKEN` | Protects `GET /api/v1/metrics`. |

Turn on two-factor authentication for administrators and teachers from the profile screen (`POST /api/v1/auth/2fa/setup`, then `POST /api/v1/auth/2fa/enable`).

School name, motto, colours, logo, leadership photographs, and contact details are edited in the administration office (`PUT /api/v1/settings`).

## Production

`docker compose up -d --build` starts Postgres, Redis, the API, the site, Nginx, and the nightly backup job.

Before exposing the host:

1. Point the domain at the server and place TLS certificates in `docker/nginx/ssl` (see `docker/nginx/ssl/README.md`).
2. Set `NGINX_CONF=./docker/nginx/nginx.ssl.conf` and replace `SCHOOL_DOMAIN` in that file.
3. Set `PUBLIC_API_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` to the HTTPS origin.
4. Keep SMTP and other secrets in `backend/.env`.
5. Apply migrations with `npm run db:migrate:deploy` from `backend`, or let the API container run `prisma migrate deploy` on start.

Use managed Postgres and Redis when the school moves off a single machine. Keep uploads on a persistent disk. Copy the `backups` volume off the server; a dump on the same disk is not a restore plan.

## Backups

The `backup` service writes a compressed `pg_dump` into the `backups` volume each night at `BACKUP_HOUR_UTC` and deletes files older than `BACKUP_RETENTION_DAYS`.

Restore replaces the current database:

```sh
docker compose stop backend
sh scripts/restore.sh backups/sombetini-YYYYMMDD-HHMMSS.sql.gz
docker compose start backend
```

On Windows without the full stack: `powershell -File scripts/backup.ps1`.

## Security

- Access checks run in the API. A parent token cannot read another family's results or fees, including while a child claim is still pending.
- Secrets stay on the server. The only public frontend setting is `NEXT_PUBLIC_API_URL`.
- Uploads are size- and type-checked. The API stores file paths; the host should scan files before they are served.
- Each sign-in has its own refresh token. A reused token signs that account out. Users can revoke sessions from the profile endpoints.
