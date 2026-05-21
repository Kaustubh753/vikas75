@AGENTS.md

# Vikas 75 — Developer Guide

A multiplayer Indian government schemes card game. Players use their phones as controllers; a host laptop runs the game; a TV/projector shows the public screen. Built with Next.js 15 App Router, Pusher for real-time sync, Upstash Redis for persistence, and Claude as the AI judge.

---

## Architecture

```
Player phones  ──┐
Host phone/tab ──┼──► Next.js API (/api/game) ──► Redis (rooms)
Projector tab  ──┘         │
                           └──► Pusher (game:room-updated) ──► all clients
```

All state lives in `GameRoom` (Redis). Every mutation writes the updated room to Redis and triggers a `game:room-updated` Pusher event with the full room payload. Clients replace local state wholesale on each event — no diffs.

---

## Game Flow

```
lobby → challenge-reveal → submission → reveal → judging → winner
                                                              │
                                              ┌── between-rounds (repeat) ──┐
                                              └── game-over
```

The host calls `POST /api/game { action: 'advance' }` at each step. The `judging` phase is the only automated step: after advancing to `judging`, the server fires-and-forgets `triggerJudge()` via `after()` (Next.js), which calls Claude and auto-advances to `winner`.

---

## File Map

### Types
- `src/types/game.ts` — All shared types. `GamePhase`, `GameRoom`, `Player`, `Submission`, `JudgeVerdict`, `SchemeCard`, `ChallengeCard`, `PusherEventMap`.

### Library
- `src/lib/game-engine.ts` — Pure state-transition functions. No I/O.
  - `createRoom(hostId, hostName, totalRounds?)` — creates room in lobby phase
  - `dealHand()` — always draws from full 75-card pool (supports 15+ players; hands can overlap)
  - `addPlayer(room, id, name)` — adds player with fresh hand, `joinedRound` set to current round
  - `startRound(room)` — increments round, picks a challenge card, resets submissions
  - `startSubmission(room)` — sets `timerEndsAt = now + 90s`
  - `addSubmission(room, submission)` — idempotent add to submissions map
  - `applyVerdict(room, verdict)` — +2 pts to winner, +1 bonus if `bonusPoint` true, sets `phase: 'winner'`
  - `advancePhase(room)` — state machine dispatcher; `judging` phase does nothing (AI handles it)
  - `allPlayersSubmitted(room)` — true when every player has a submission
  - `getLeaderboard(room)` — sorted player array

- `src/lib/redis.ts` — Transparent Redis / in-memory fallback.
  - Uses module-level `Map` when `UPSTASH_REDIS_REST_URL` is absent (local dev)
  - Lazily requires `@upstash/redis` to avoid startup crash without env vars
  - TTL: 6 hours
  - Exports: `getRoom`, `setRoom`, `deleteRoom`, `listActiveRooms`

- `src/lib/pusher.ts` — `pusherServer` (server-side SDK), `getPusherClient()` (singleton), `getRoomChannel(code)` → `game-${code}`.

- `src/lib/ai-judge.ts` — Dual-mode judge.
  - Uses `claude-sonnet-4-20250514` when `ANTHROPIC_API_KEY` present
  - Falls back to `fallbackJudge()` (random winner + 8 fun Hindi-flavoured verdicts) when key absent
  - Strips accidental markdown fences from Claude's JSON response
  - Bonus point: `explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1`
  - If Claude throws, falls back silently

### API
- `src/app/api/game/route.ts` — Single POST + GET endpoint.
  - `create-room` — creates room, returns `{ room }`
  - `join` — blocks only during `submission` phase; idempotent on rejoin (returns existing room)
  - `advance` — advances phase; if `hostId` present in body, validates it against `room.hostId`; fires `triggerJudge()` via `after()` when entering `judging`
  - `submit` — adds submission; auto-advances to `reveal` if all players submitted
  - `GET ?code=XXXX` — returns current room state

- `src/app/api/admin/route.ts` — Basic Auth (env vars `ADMIN_USER`/`ADMIN_PASS`). `GET ?action=rooms` lists active room codes.

### Pages (all async, all await params/searchParams)
- `src/app/page.tsx` — Home. Passes `initialCode` from `searchParams.code` to `<HomePage>`.
- `src/app/host/[code]/page.tsx` — Host panel. Passes `code` and `hostId` (from `searchParams.h`) to `<HostPanel>`.
- `src/app/room/[code]/page.tsx` — Player room. Passes `code` to `<PlayerView>`.
- `src/app/projector/[code]/page.tsx` — Projector. Passes `code` to `<ProjectorView>`.
- `src/app/admin/page.tsx` — Admin login.
- `src/app/admin/dashboard/page.tsx` — Admin dashboard.

### Player Components
- `src/components/player/HomePage.tsx` — Join/create screen. Uses `<CodeInput>`. Stores `vikas75_playerId` and `vikas75_playerName` in sessionStorage on join. Host redirected to `/host/[code]?h=[hostId]`.
- `src/components/player/HostPanel.tsx` — Host controls. Accepts `hostId` as prop (from URL, not sessionStorage). Shows advance button with phase-appropriate label, error display, player list, leaderboard.
- `src/components/player/PlayerView.tsx` — Player state machine. Reads identity from sessionStorage in `useEffect` only (avoids hydration mismatch). Redirects to `/?code=${code}` if no identity found.
- `src/components/player/PlayerSubmit.tsx` — Card selection + explanation. Horizontal scroll tray; second tap expands card to 220px; char counter; bonus point hint (≤1 sentence).
- `src/components/player/PlayerLobby.tsx` — Waiting in lobby, shows player list.
- `src/components/player/PlayerWaiting.tsx` — Generic waiting screen with pulsing dots.

### Projector Components
- `src/components/projector/ProjectorView.tsx` — Projector state machine. Subscribes to Pusher. Routes to phase-specific screens.
- `src/components/projector/ProjectorLobby.tsx` — `'use client'`. Shows room code, QR code (via `qrcode.react`), player list. `window.location.origin` read in `useEffect` only.
- `src/components/projector/ProjectorChallengeReveal.tsx` — Dramatic challenge card reveal.
- `src/components/projector/ProjectorSubmission.tsx` — Submission countdown, shows who has submitted.
- `src/components/projector/ProjectorReveal.tsx` — Shows all submitted scheme cards.
- `src/components/projector/ProjectorJudging.tsx` — AI deliberating animation.
- `src/components/projector/ProjectorWinner.tsx` — Winner announcement with verdict.
- `src/components/projector/ProjectorBetweenRounds.tsx` — Leaderboard between rounds.
- `src/components/projector/ProjectorGameOver.tsx` — Final standings.

### UI Components
- `src/components/ui/CodeInput.tsx` — OTP-style 4-box room code input. `onChange` for mobile compatibility (IME-safe); `onKeyDown` for backspace navigation; `onPaste` fills all boxes; `onFocus` selects content; `caret-transparent` hides cursor.
- `src/components/ui/Button.tsx` — Generic button with variant styles.
- `src/components/ui/TricolourBar.tsx` — Saffron/white/green stripe used in headers.

### Cards and Cards Components
- `context/cards_challenges.json` — 30 challenge cards (c001–c030). Fields: `id`, `en`, `hi`, `icon`.
- `context/cards_schemes.json` — 75 scheme cards (s001–s075). Fields: `id`, `name`, `hi`, `desc`, `bullets[]`.
- `src/components/cards/ChallengeCard.tsx` — Visual card component.
- `src/components/cards/SchemeCard.tsx` — Visual card component.

### Styles and Config
- `src/app/layout.tsx` — Loads Inter, Oswald, Noto Sans Devanagari from Google Fonts as CSS custom properties: `--font-oswald`, `--font-devanagari`, `--font-inter`.
- `src/app/globals.css` — `@keyframes slide-up`, `@keyframes fade-in`, `.animate-slide-up`, `.animate-fade-in`.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_APP_KEY` | Yes | Pusher client key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Yes | e.g. `ap2` (Mumbai) |
| `PUSHER_APP_ID` | Yes | Pusher server-side |
| `PUSHER_SECRET` | Yes | Pusher server-side |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL; falls back to in-memory |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token |
| `ANTHROPIC_API_KEY` | No | Claude judge; falls back to random |
| `ADMIN_USER` | No | Admin dashboard Basic Auth |
| `ADMIN_PASS` | No | Admin dashboard Basic Auth |

Without Redis env vars, state lives in a module-level `Map` — rooms are lost on server restart and not shared across serverless instances.

---

## Bugs Fixed (History)

1. **Start Game silently failed** — `advance()` in HostPanel bailed silently when `hostId` was empty (stale sessionStorage). Fixed: `hostId` embedded in host URL as `?h=<uuid>`, passed as prop, errors now surfaced in UI.

2. **Players blocked from joining in lobby** — Join check was `phase !== 'lobby' && phase !== 'between-rounds'`. Fixed: now only blocks during `submission` phase.

3. **Player limit at ~10–11** — `dealHand(usedSchemeIds)` tried to give unique cards; exhausted pool at player 11. Fixed: `dealHand()` always draws independently from full 75-card pool.

4. **Join blocked between rounds** — Same fix as #2.

5. **`Join Game` button always disabled** — Was `code.length !== 4`; fixed to `!code.trim()`.

6. **Inverted loading label** — Button showed wrong label when loading. Fixed.

7. **TypeScript: `getRedis().get<GameRoom>()`** — Dynamic `require()` lost type info. Fixed: cast to `Promise<GameRoom | null>`.

8. **Next.js 15: `params` as Promise** — All `[code]` page files used sync `params.code`. Fixed: all page components are `async`, `await params` and `await searchParams`.

9. **Hydration mismatch in PlayerView** — sessionStorage read at render time. Fixed: moved to `useEffect`, initialized state as `''`.

10. **Hydration mismatch in ProjectorLobby** — `window.location.origin` used outside client context. Fixed: added `'use client'`, moved to `useEffect`.

---

## Known Issues / What Still Needs Fixing

### Functional
- **Timer is UI-only** — `timerEndsAt` is set but the server never auto-advances when it expires. The host must manually click "End Submissions". A cron/webhook or client-side `setTimeout` that calls `advance` is needed.
- **Players who join mid-game don't get fresh hands between rounds** — `joinedRound` is stored but hands are not refreshed on `between-rounds`. Late joiners keep their original hand indefinitely.
- **No reconnection handling** — If a player refreshes during `submission`, they lose their selected card state (but can re-submit). `PlayerView` redirects home if sessionStorage is gone (incognito, cleared storage).
- **Duplicate room codes** — `generateRoomCode()` doesn't check Redis for collisions. Probability is low (24^4 = 331,776 possibilities) but not zero.
- **`allPlayersSubmitted` includes late joiners** — If a player joins during `challenge-reveal`, they're expected to submit before auto-advance triggers. Consider excluding players with `joinedRound === room.round`.
- **No submission timer auto-advance** — Related to timer issue above.

### UI / UX
- **No toast/feedback on successful submission** — PlayerSubmit just disables the button; no confirmation message.
- **Projector screens have no fallback if Pusher disconnects** — Should poll GET `/api/game?code=` every few seconds as a heartbeat.
- **Host panel doesn't show current challenge** — Host can't see what the current challenge card is; only shows phase name.

### Infrastructure
- **In-memory fallback doesn't work across serverless instances** — In production (Vercel), multiple instances will not share the `devStore` Map. Upstash Redis is required for production.
- **No room cleanup** — `deleteRoom` is never called. Rooms expire after 6 hours via TTL but stale rooms accumulate. Admin route can list them but there's no delete UI.

---

## Running Locally

```bash
cd vikas75
npm install
# Copy .env.local and fill in Pusher keys (minimum required)
npm run dev
```

Open three windows:
1. `http://localhost:3000` — player join / host create
2. `http://localhost:3000/projector/[CODE]` — the big screen
3. `http://localhost:3000/host/[CODE]?h=[HOST_ID]` — host controls (link shown on join)

Without Upstash Redis, rooms live in memory — works fine for single-instance local dev.
Without `ANTHROPIC_API_KEY`, the fallback judge picks a random winner with a fun Hinglish verdict.
