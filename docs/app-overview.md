# Kue App – Implementation Overview

This document summarizes how the current Kue app works based on the live implementation. It focuses on user flows, data behavior, and the screens you’ll see in the product.

---

## 1) What the app does
Kue is a multi‑session, mobile‑first system for managing courts, queues, players, matches, fees, and brackets. Admins/staff operate sessions and courts, while players use public links to join and view live status.

---

## 2) Core data model (conceptual)

**Sessions**
- Multiple sessions can be open at once.
- Fields: `gameType` (singles/doubles), `feeAmount`, `regularJoinLimit`, `newJoinerLimit`, `status`.

**Courts + Court Sessions**
- Courts are global; each open session creates a court_session per active court.
- Court session holds status, current match, and match metadata.

**Players + Session Players**
- Players are global, session_players are per‑session.
- Status: `checked_in`, `present`, `away`, `done`.
- Tracks `checkedInAt`, `lastPlayedAt`, `gamesPlayed`, wins/losses.
- `isNewPlayer` is set from the public join page.

**Queue Entries**
- Singles: 1 player per entry.
- Doubles: 2 players per entry.
- Entries can be manually reordered.

**Matches**
- Matches have participants with team numbers.
- End match optionally saves score + winner.

**Payments**
- Tracks per‑session balances and payment records.

**Links**
- Player link: `/p/:token`
- Public queue: `/q/:token`
- Invite link: `/join/:token` (session invite)
- Share links can expire or be revoked.

**Bracket Overrides**
- Stores manual winners/scores and manual singles seeding.

---

## 3) Primary screens and flows

### Dashboard (Home)
- Shows the selected session (via global switcher).
- Actions: Add Session, Edit Session, Open/Close, Edit Fee.
- Courts list is redesigned: status, start time, elapsed time, players, and match actions.
- Animated glow for active courts.
- Past sessions are collapsible; can view roster or delete.

### Players
- Shows only players in the session.
- **Singles**: select 2 players → confirm queue modal.
- **Doubles**: select 4 players → pairing modal with drag + ghost.
- Join order numbers:
  - Regular: r1, r2…
  - New joiners: n1, n2…
  - Dynamic re‑numbering when players are removed.
- “Mark Present” appears only when selected players are ready/checked_in.
- When the session is closed: selection/highlight disabled, idle timers stop, Add Player disabled.

### Queue / Match tab
- Lists queued matches.
- Courts list sorted by court number.
- Cancel match confirmation dialog.

### Rankings
- Podium‑style top 3 with animations.
- Row list for the rest with upper‑right rank icons.
- Public queue modal mirrors the same icon style.

### Fees
- Lists balances and lets staff mark paid.
- Player names use smaller, lighter Manrope.

### Brackets
- Uses `vue3-tournament`.
- Types: single, double, round robin.
- Singles seeding is manual (drag/drop order) and saved to backend.
- Doubles uses Team Builder teams.
- Export JSON + print.
- Fullscreen retains gradient background + scroll.

### Team Builder (Doubles)
- Separate page for building teams.
- Compact list (two per row on wide screens).

---

## 4) Public pages

**Public Queue (`/q/:token`)**
- Live courts (same style as Dashboard courts).
- Upcoming queue matches.
- Ranking modal.
- Bracket modal (fullscreen with consistent background).

**Public Player (`/p/:token`)**
- Player status + queue position.

**Session Invite**
- Join form with “New player” checkbox.

---

## 5) Session switching
- Header switcher controls which session is shown in Players/Rankings/Fees/Bracket.
- Creating a new session auto‑selects it after refresh.

---

## 6) Notable behavior rules
- Duplicate queueing triggers a warning modal.
- “Present” status is manually set by admin when players arrive on court day.
- Join limits (regular/new) gray out cards after thresholds.
- Idle timer labels only run in open sessions.

