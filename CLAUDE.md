# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Kue is a badminton session/queue management app with a Vue 3 frontend and Node.js/Express backend. It manages player check-ins, court queues, match tracking, payments, and public-facing share pages.

## Development Commands

### Backend (port 4000)
```bash
cd backend
npm run dev              # Start dev server
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed database
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Visual DB browser
```

### Frontend (port 5173)
```bash
cd frontend
npm run dev              # Start Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
```

### Version bumping
```bash
./scripts/bump-version.sh patch           # Bump patch version
./scripts/bump-version.sh minor           # Bump minor version
./scripts/bump-version.sh 1.2.3           # Set exact version
./scripts/bump-version.sh patch --dry-run # Preview changes
```

## Environment Setup

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/kue
JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGINS=https://kue.arshii.net,https://localhost,http://localhost,capacitor://localhost
ADMIN_EMAIL=admin@kue.local
ADMIN_PASSWORD=password123
# Optional: RESEND_API_KEY, RESEND_FROM, APP_BASE_URL
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:4000/api
```

## Architecture

### Frontend (`frontend/src/`)
- **`api.js`** — Centralized fetch-based HTTP client. All 70+ API calls go through here. Add new endpoints here before using them in pages.
- **`router.js`** — Route definitions with a single auth guard that checks `localStorage` for a JWT token. Public routes (`/p/:token`, `/q/:token`, `/board/:id`) bypass auth.
- **`state/sessionStore.js`** — Shared reactive state for the currently selected session, persisted to `localStorage`.
- **`pages/`** — One component per page/route. No Vuex/Pinia — state is passed via props or imported from sessionStore.
- **`utils/`** — Pure utility functions: `seedOrder.js` (tournament seeding), `teamBuilder.js` (team auto-assignment).

### Backend (`backend/src/`)
- **`app.js`** — Express setup: CORS, JSON parsing, route mounting.
- **`routes/`** — One file per resource domain. All routes require `requireAuth()` middleware except those in `public.js`.
- **`middleware/auth.js`** — `requireAuth()` validates JWT; `requireRole('admin'|'staff')` checks roles.
- **`services/email.js`** — Email via Resend API. Handles verification tokens and password reset tokens.
- **`services/queue.js`** — Business logic for queue operations (separate from HTTP layer).
- **`lib/prisma.js`** — Prisma client singleton. Import from here, not directly.

### Database (Prisma + PostgreSQL)
Schema is in `backend/prisma/schema.prisma`. Key relationships:
- **Session** is the top-level container — courts, players, queue, matches, and payments all belong to a session.
- **SessionPlayer** tracks a player's state within a session (status, stats). A Player can be in many sessions.
- **Queue** → **QueueEntryPlayer** links queue entries to players (1 for singles, 2 for doubles).
- **Match** → **MatchParticipant** tracks which players are on which team in a match.
- **CourtSession** links courts to sessions and tracks current/next match per court.
- **ShareLink** (player-scoped) and **SessionShareLink** (session-scoped) generate tokenized public URLs.

### Auth Flow
- JWT stored in `localStorage` as `token`.
- Frontend sends `Authorization: Bearer <token>` on all authenticated requests.
- Email verification and password reset use short-lived tokens stored in the User model.

### Public Pages
Routes under `/public/*` and frontend pages `/p/:token`, `/q/:token`, `/board/:id` are unauthenticated. They use share link tokens or session IDs to scope data.

## No Tests
There is no automated test suite. Testing is manual.
