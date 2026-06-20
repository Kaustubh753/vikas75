# Session Handoff — Context & Reasoning

This document carries the *thought process* behind recent work so a fresh Claude Code
session (on any account) can pick up with full context. For architecture, file map, env
vars, and the running bug-history, read **`CLAUDE.md`** and **`AGENTS.md`** first — this
file only adds the narrative and reasoning that commit messages alone don't fully capture.

---

## Recent work, newest first

### 1. Submission & judging phases could stall (`a98d296`)
Found while testing the full game loop end-to-end. Two independent auto-advance bugs:

- **Submission never advanced.** `allPlayersSubmitted()` in `src/lib/game-engine.ts`
  excludes any player whose `lastSeen` is older than 45 s (so a dropped phone doesn't
  stall the round). But nothing refreshed `lastSeen` when a player *submitted* — the only
  refresh was the browser's 20 s heartbeat, which mobile browsers **throttle when the tab
  is backgrounded or the phone locks**. A player who submitted then put their phone down
  could be wrongly treated as disconnected; if all submitters went stale the function
  returned `false`, so the `after()` auto-advance was never scheduled. Fix: refresh
  `lastSeen` on submit, since submitting is definitive proof of presence.

- **Judging froze after round 1.** The lock `lock:judging:${code}` had a 60 s TTL and was
  **never released**. Round 1 grabbed it; round 2's `triggerJudge` couldn't acquire it
  within 60 s, returned early, and since `advancePhase` is a no-op during `judging`, the
  game froze. It only worked in slow real-world play because rounds normally exceed 60 s.
  Fix: scope the lock to `${code}:${round}` so each round judges independently while still
  guarding against double-fires within a round.

**Testing method (reusable):** the whole flow was validated via `curl` against the local
dev server — create-room → join 2 players → advance to submission → submit each player's
first hand card (fetch the hand with `GET /api/game?code=XXXX&me=<pid>`) → poll the phase.
A full 3-round game was driven to `game-over` this way. Note: curl sends no heartbeats, so
test players go `lastSeen`-stale after 45 s — submit within that window, or the first bug's
symptom reappears as a test artifact. `after()` works fine in Turbopack dev; it was never
the problem.

### 2. Landing page cleanup (`c8e44ae`)
Removed the "How to Play" link from the landing-page bottom strip per request.

### 3. Cleanup pass (`f70e2ff`)
Ten-item sweep: generated `public/og-image.png` (1200×630, via sharp); deleted unused
`HostDashboard.tsx` (never imported); removed `'correct'` from the music `TrackName` union;
dropped dead `@keyframes` from `globals.css`; deduped the scheme card-image helper to
`@/lib/cards`; simplified the Explore "Team" tab to a placeholder; added draft-cleanup on
game-over in `PlayerView`; and added an **admin "End Room"** feature — `DELETE /api/game?code=`
(Basic-auth, timing-safe credential compare) plus a button in the admin dashboard.

### 4. Projector lobby redesign (`522fed7`, `f95a9a9`, `addff8a`)
Rewrote `src/components/projector/ProjectorLobby.tsx` to a design-system handoff: vertical
flex layout (header → join-card + seats + banter → footer → ticker), glass join-card with a
QR code, cream playing-card letter tiles, seat grid that resizes by player count, banter
chips that animate in as players join. Replaced placeholder ticker facts with **20 verified
government-scheme statistics**. Restored five branding elements lost in the redesign: social
links, the "An initiative…" attribution, the "The best answer isn't always right." tagline,
the dynamic origin URL, and the saffron left-border logo unit.

---

## Known issues / not yet done
- **Incognito reconnection** — a player in a private window who refreshes loses localStorage
  identity and rejoins as a duplicate. No fix yet.
- **In-memory store is single-instance** — production (Vercel) needs Upstash Redis; the
  fallback `Map` isn't shared across serverless instances.
- ESLint config is on the old `.eslintrc` format and errors under ESLint 9's flat-config
  default; `tsc --noEmit` is the reliable check for now.

## Running locally
```bash
npm install
# create .env.local with Pusher keys (min) + optional Redis / ANTHROPIC_API_KEY / admin creds
npm run dev
```
`.env.local` is gitignored — see the env-var table in `CLAUDE.md`. Without Redis the store is
in-memory; without `ANTHROPIC_API_KEY` the judge picks a random winner with a Hinglish verdict.
