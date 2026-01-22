# Kue MVP - Queue + Courts + Fees + Share Links

Date: 2026-01-22

Assumptions / defaults (per user request):
- New build in `frontend/` and `backend/`.
- Open registration for queue masters (default role: admin).
- One active session at a time (simplifies court status and queueing).
- Fee mode default: per-player flat fee; session can be configured.
- Public links: `/p/:token` for player status, `/board/:sessionId` for session board.

---

## 1) MVP Requirements, User Stories, Acceptance Criteria

### MVP Requirements
- Sessions: create/open/close; active session query; close locks queue/match updates (admin override).
- Courts: CRUD; status (available/in_match/maintenance); show current + next match.
- Players: CRUD; session status (checked_in/away/done); session stats (games_played, last_played_at).
- Queue & matches: singles and doubles only; check-in, enqueue, dequeue, reorder; suggest next match; start/end match; return to queue or mark done.
- Fees: session fee mode (flat or per_game); ledger payments; balances; who owes report.
- Share links: tokenized view-only links per player; revoke/rotate; optional expiry; public board for session.

### User Stories + Acceptance Criteria
1) As an organizer, I can create a session and open it so queues/matches are tied to it.
   - AC: Session can be created with name, start/end time, fee config.
   - AC: Opening a session sets it as active and enables queue operations.

2) As staff, I can manage courts and see which courts are playing or available.
   - AC: Courts can be created/edited/archived.
   - AC: Each court shows status and current/next match for the active session.

3) As staff, I can check-in players and manage their status (away/done).
   - AC: A player can be checked-in to a session, marked away, or marked done.
   - AC: Session stats update after matches end.

4) As staff, I can enqueue players (singles) or teams (doubles) and reorder.
   - AC: Queue entry supports singles (1 player) or doubles (2 players).
   - AC: Manual reordering persists.
   - AC: Removing/marking away removes from active queue.

5) As staff, I can suggest and start a match when a court is available.
   - AC: Suggestion chooses the fairest eligible match based on waiting time and last played.
   - AC: Starting a match updates court status to in_match and locks the participants.

6) As staff, I can end a match and optionally record score/winner.
   - AC: Ending a match updates court status to available.
   - AC: Players return to queue or are marked done based on session setting.

7) As organizer, I can track fees and payments per player.
   - AC: Balances are computed as fee_due - payments_total.
   - AC: Partial payments are allowed with method notes.

8) As a player, I can open a share link and see my status and queue position.
   - AC: Link is view-only and tokenized.
   - AC: Link can be revoked or expires when session closes.

9) As a viewer, I can open a public session board to see current and next matches.
   - AC: Board shows each court and current/next match for active session.

---

## 2) Database Schema (PostgreSQL) + ERD Description

### ERD (text)
- users *- user_roles -* roles
- sessions 1-* session_players *- players
- sessions 1-* queue_entries *- queue_entry_players -* players
- sessions 1-* matches *- match_participants -* players
- sessions 1-* payments *- players
- sessions 1-* share_links *- players
- sessions 1-* court_sessions *- courts

### SQL Schema (MVP)

```sql
-- roles and users
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('draft','open','closed')),
  fee_mode TEXT NOT NULL CHECK (fee_mode IN ('flat','per_game')),
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  return_to_queue BOOLEAN NOT NULL DEFAULT TRUE,
  announcements TEXT,
  created_by UUID REFERENCES users(id),
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- courts
CREATE TABLE courts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE court_sessions (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available','in_match','maintenance')),
  current_match_id UUID,
  next_match_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, court_id)
);

-- players
CREATE TABLE players (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT,
  contact TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE session_players (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('checked_in','away','done')),
  checked_in_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_played_at TIMESTAMP,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_queue_seconds INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, player_id)
);

-- queue
CREATE TABLE queue_entries (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('singles','doubles')),
  status TEXT NOT NULL CHECK (status IN ('queued','assigned','removed')),
  position INTEGER NOT NULL,
  manual_order BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE queue_entry_players (
  entry_id UUID NOT NULL REFERENCES queue_entries(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, player_id)
);

-- matches
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  court_session_id UUID REFERENCES court_sessions(id),
  status TEXT NOT NULL CHECK (status IN ('proposed','active','ended','cancelled')),
  match_type TEXT NOT NULL CHECK (match_type IN ('singles','doubles')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  score_json JSONB,
  winner_team INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE match_participants (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL CHECK (team_number IN (1,2)),
  PRIMARY KEY (match_id, player_id)
);

-- payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- share links
CREATE TABLE share_links (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- indexes
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_court_sessions_session ON court_sessions(session_id);
CREATE INDEX idx_queue_entries_session ON queue_entries(session_id);
CREATE INDEX idx_queue_entries_position ON queue_entries(session_id, position);
CREATE INDEX idx_matches_session ON matches(session_id);
CREATE INDEX idx_payments_session_player ON payments(session_id, player_id);
CREATE INDEX idx_share_links_token ON share_links(token);
```

---

## 3) REST API Spec (MVP)

Base: `/api`

### Auth
- `POST /auth/register`
  - req: `{ email, password, fullName }`
  - res: `{ token, user: { id, email, fullName, roles } }`
- `POST /auth/login`
  - req: `{ email, password }`
  - res: `{ token, user: { id, email, fullName, roles } }`

### Sessions
- `POST /sessions` (admin)
  - req: `{ name, startsAt, endsAt, feeMode, feeAmount, returnToQueue, announcements }`
- `POST /sessions/:id/open` (admin)
- `POST /sessions/:id/close` (admin)
- `GET /sessions/active` (admin/staff)
- `GET /sessions/:id` (admin/staff)

### Courts
- `GET /courts` (admin/staff)
- `POST /courts` (admin)
- `PATCH /courts/:id` (admin)
- `POST /courts/:id/status` (admin/staff)
  - req: `{ sessionId, status }`

### Players
- `GET /players` (admin/staff)
- `POST /players` (admin/staff)
- `PATCH /players/:id` (admin/staff)
- `POST /players/:id/checkin` (admin/staff)
  - req: `{ sessionId }`
- `POST /players/:id/checkout` (admin/staff)
  - req: `{ sessionId, status: 'away'|'done' }`

### Queue
- `GET /queue/:sessionId` (admin/staff)
- `POST /queue/:sessionId/enqueue` (admin/staff)
  - req: `{ type: 'singles'|'doubles', playerIds: [..] }`
- `POST /queue/:sessionId/dequeue` (admin/staff)
  - req: `{ entryId }`
- `POST /queue/:sessionId/reorder` (admin/staff)
  - req: `{ orderedEntryIds: [..] }`
- `POST /queue/:sessionId/away` (admin/staff)
  - req: `{ entryId }`

### Matches
- `POST /matches/:sessionId/suggest` (admin/staff)
  - res: `{ matchType, teams: [[playerIds],[playerIds]] }`
- `POST /matches/:sessionId/start` (admin/staff)
  - req: `{ courtSessionId, teams, matchType }`
- `POST /matches/:sessionId/end` (admin/staff)
  - req: `{ matchId, score, winnerTeam }`

### Payments
- `GET /payments/:sessionId/balances` (admin/staff)
- `POST /payments/:sessionId` (admin/staff)
  - req: `{ playerId, amount, method, note }`

### Share Links
- `POST /share-links/:sessionId` (admin/staff)
  - req: `{ playerId, expiresAt }`
- `POST /share-links/:id/revoke` (admin/staff)
- `GET /public/player/:token` (public)
- `GET /public/board/:sessionId` (public)

Auth: JWT via `Authorization: Bearer <token>`.

---

## 4) UI Screens (Mobile-first)

### Session Dashboard
- Court cards (large, tap targets): court name, status, current match, next suggested.
- Primary actions: Start Match / End Match (big buttons).
- One-handed: bottom action bar (Suggest Next, Queue, Fees).

### Login / Register (Queue Master)
- Email + password login.
- Open registration for new organizers/staff.
- Fast route to active session once authenticated.

### Queue Screen
- Segmented toggle: Doubles / Singles.
- Queue list with drag handles, last played time, wait duration.
- Quick actions: mark away, remove, move to top.

### Courts Screen
- Court management list + status controls.
- Maintenance toggle per court.
- Assign next match from suggestions.

### Players Screen
- Search + check-in/out; badge for status.
- Quick actions: Add to queue, Generate share link, Mark done.

### Fees Screen
- Balance list (owed/paid/remaining).
- Record payment modal (amount + method + note).
- Export CSV button.

### Public Player Status Page
- Read-only: status, queue position, up next, assigned court.
- Big status badge; QR code view button.

### Public Session Board
- Large grid of courts: now playing + next.
- Fullscreen mode toggle for TV.

---

## 5) Fairness Algorithm (Pseudocode)

```text
Input: queue_entries, session_players
Filter: entries with status = 'queued'
For each entry:
  players = entry players
  lastPlayed = min(session_player.last_played_at) (null -> oldest)
  queuedAt = entry.created_at
Sort entries by:
  1) lastPlayed (null first, oldest first)
  2) queuedAt (oldest first)

If match_type = doubles:
  Take top 2 entries that each have 2 players and are eligible
If match_type = singles:
  Take top 2 entries that each have 1 player and are eligible
Return suggested teams (or null if not enough players)
```

Manual override: if any queued entries are marked manual, sort by position first, otherwise use fairness score.

---

## 6) Testing Plan

### Unit
- Queue fairness sorting by last_played_at, queued_at, and manual position.
- Payments balance calculation (flat vs per_game).
- Token generation uniqueness for share links.

### Integration
- Session lifecycle: create -> open -> queue -> match -> close.
- Court status updates through match start/end.
- Queue enqueue/reorder/dequeue flows.
- Share link access and revocation.

### Edge Cases
- Odd players in doubles: enqueue remains; suggest returns null if <2 teams.
- Player leaves while queued: entry removed; in match -> match cancelled.
- Court in maintenance: cannot start match on it.
- Duplicate player names: use IDs in API; UI shows nickname.
- Session closes with active queues: prevent enqueue/match start; allow admin override.
```
