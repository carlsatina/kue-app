# Kue App

Multi‑session, mobile‑first queue + court management system for badminton / pickleball / tennis clubs.

## Stack
- Frontend: Vue 3 + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT

## Repo structure
- `frontend/` – Vue 3 app
- `backend/` – Express API + Prisma schema
- `docs/` – MVP spec & product docs

## Getting started

### 1) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Optional seed data:
```bash
npm run prisma:seed
```

### 2) Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Version bump (web + Android)
```bash
./scripts/bump-version.sh patch
# or:
./scripts/bump-version.sh 0.2.0 --code 12
```

## Environment
Backend `.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`
- `CORS_ORIGINS` (comma-separated, e.g. `https://kue.arshii.net,https://localhost,capacitor://localhost`)
- `ADMIN_EMAIL` (seed)
- `ADMIN_PASSWORD` (seed)
- `RESEND_API_KEY` (email verification)
- `RESEND_FROM` (e.g. `Kue <no-reply@yourdomain.com>`)
- `APP_BASE_URL` (frontend base URL for verify links)
- `EMAIL_VERIFY_TTL_HOURS` (optional, default 24)
- `PASSWORD_RESET_TTL_HOURS` (optional, default 2)

Frontend `.env`:
- `VITE_API_URL` (default `http://localhost:4000/api`)

## Notes
- Multiple sessions can be open at once; use the header session switcher to change context.
- Public share pages:
  - Player status: `/p/:token`
  - Queue view: `/q/:token` (includes live courts + bracket modal)
  - Session board: `/board/:sessionId`
- Rankings live at `/rankings`.

## Docs
- `docs/mvp.md` – requirements, DB schema, API spec, UI notes, testing plan
- `docs/app-overview.md` – implementation‑based product overview
