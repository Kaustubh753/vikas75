@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Read `AGENTS.md` (imported above) first: this repo runs **Next.js 16** (App Router) + **React 19**, which differ from older training data. Consult `node_modules/next/dist/docs/` before writing framework code.

# Vikas 75 — Developer Guide

A multiplayer Indian government schemes card game. Players use their phones as controllers; a host laptop runs the game; a TV/projector shows the public screen. Built with Next.js 16 App Router, React 19, Pusher for real-time sync, Upstash Redis for persistence, and Claude as the AI judge.

---

## Commands

```bash
npm run dev          # next dev — local server on :3000
npm run build        # next build — production build (run this to catch type errors)
npm run start        # next start — serve the production build
npm run lint         # eslint .
npx tsc --noEmit     # type-check only (no test runner exists in this repo)
```

There is **no test framework** — no `test` script, no `*.test.*` files. Verification is done by `npm run build` (which type-checks), `npm run lint`, and manual play-testing across the three windows described in *Running Locally*. Don't reference a test suite that doesn't exist.

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

## Cross-Cutting Concerns (read before touching `api/game/route.ts`)

These three mechanisms span the whole API and are invisible if you only read one handler. Get them wrong and you reintroduce races, impersonation, or hand leaks.

### 1. Auth & secrets — nothing trusts the client's claimed identity
`GameRoom.hostId` and `GameRoom.tokens` (a `playerId → secret` map) are **credentials** and must never reach a client.
- `stripSecrets(room)` removes both; `scrubRoomFor(room, playerId)` additionally **strips every hand except `playerId`'s** (hands are private). Every client-facing payload — POST responses, GET, and Pusher broadcasts — must go through one of these. Never return a raw `room`.
- On `join`, the server issues a per-player token (`crypto.randomUUID()`) and returns it once; the client stores it and sends it back on every state-changing action (`submit`, `chat`, `emote`, `heartbeat`) and on own-hand reads (GET `?me=` + `x-player-token` header).
- `tokenOk(room, playerId, token)` gates those actions. Note the **transitional rule**: if no token was ever issued for a player (legacy rooms), it returns `true`. Keep that escape hatch until legacy rooms expire, or you'll lock out in-flight games.
- Host-only actions (`advance`, `update-settings`, `end-game`, `music-toggle`) are gated by matching the raw `hostId` from the body against `room.hostId` (403 otherwise).

### 2. Concurrency — every write goes through one per-room lock
`withRoomLock(code, fn)` (built on `acquireLock`/`releaseLock` in `redis.ts`) serializes all read-modify-write sequences for a room. Without it, concurrent writers clobber each other's snapshot (a stale heartbeat reverting `winner`→`judging`, a lost submission, double-scoring). **Any handler that reads a room, mutates it, and writes it back must run inside `withRoomLock`.** It briefly retries (~1s) then returns `null` so the caller can surface a safe "busy" fallback rather than corrupting state.

### 3. Rate limiting & client IP
Best-effort in-memory `rateLimit(key, max, windowMs)` (not shared across serverless instances). Derive the client key from `getIp(req)`, which reads `x-real-ip` (Vercel edge, unspoofable) and the **last** `x-forwarded-for` value — never the first, which is client-controlled and trivially spoofable.

### Input sanitization
User text is cleaned before storage: `sanitizeName()` (length/trim) and `filterText()` (profanity/junk) on names and chat. Settings actions clamp `totalRounds`/`timerDuration`/`gameMode` server-side — never trust the slider values as sent.

### Full POST action list
`create-room`, `join`, `advance`, `update-settings`, `submit`, `timer-expire`, `emote`, `chat`, `heartbeat`, `end-game`, `music-toggle` — plus `GET ?code=&me=`. (The File Map below details the core game actions; the rest follow the same lock + token/host-gate pattern.)

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
  - `allPlayersSubmitted(room)` — true when every player who joined *before* this round has submitted (excludes mid-round late joiners)
  - `getLeaderboard(room)` — sorted player array

- `src/lib/redis.ts` — Transparent Redis / in-memory fallback.
  - Uses module-level `Map` when `UPSTASH_REDIS_REST_URL` is absent (local dev)
  - Lazily requires `@upstash/redis` to avoid startup crash without env vars
  - TTL: 24 hours
  - Exports: `getRoom`, `setRoom`, `deleteRoom`, `listActiveRooms`

- `src/lib/pusher.ts` — `pusherServer` (server-side SDK), `getPusherClient()` (singleton), `getRoomChannel(code)` → `private-game-${code.toUpperCase()}`.

- `src/lib/ai-judge.ts` — Dual-mode judge.
  - Uses `claude-sonnet-4-20250514` when `ANTHROPIC_API_KEY` present
  - Falls back to `fallbackJudge()` (random winner + 8 fun Hindi-flavoured verdicts) when key absent
  - Strips accidental markdown fences from Claude's JSON response
  - Bonus point: `explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1`
  - If Claude throws, falls back silently

### API
- `src/app/api/game/route.ts` — Single POST + GET endpoint.
  - `create-room` — creates room, returns `{ room }`
  - `join` — blocks during `submission` and `game-over` phases; idempotent on rejoin (returns existing room)
  - `advance` — advances phase; if `hostId` present in body, validates it against `room.hostId`; fires `triggerJudge()` via `after()` when entering `judging`
  - `submit` — adds submission; auto-advances to `reveal` if all players submitted
  - `GET ?code=XXXX` — returns current room state

- `src/app/api/admin/route.ts` — Basic Auth (env vars `ADMIN_USERNAME`/`ADMIN_PASSWORD`). `GET ?action=rooms` lists active room codes.

### Pages (all async, all await params/searchParams)
- `src/app/page.tsx` — Home. Passes `initialCode` from `searchParams.code` to `<HomePage>`.
- `src/app/host/[code]/page.tsx` — Host panel. Passes `code` and `hostId` (from `searchParams.h`) to `<HostPanel>`.
- `src/app/room/[code]/page.tsx` — Player room. Passes `code` to `<PlayerView>`.
- `src/app/projector/[code]/page.tsx` — Projector. Passes `code` to `<ProjectorView>`.
- `src/app/admin/page.tsx` — Admin login.
- `src/app/admin/dashboard/page.tsx` — Admin dashboard.

### Host Components
- `src/components/host/HostDashboard.tsx` — Host controls. Accepts `hostId` as prop (from URL, not localStorage). Shows advance button with phase-appropriate label, error display, player list, leaderboard, game settings sliders.

### Player Components
- `src/app/page.tsx` — Home page (join/create screen). Uses `<CodeInput>`. Stores `vikas75_playerId`, `vikas75_playerName`, `vikas75_avatarId` in localStorage on join. Host redirected to `/host/[code]?h=[hostId]`.
- `src/components/player/PlayerView.tsx` — Player state machine. Reads identity from localStorage in `useEffect` only (avoids hydration mismatch). Redirects to `/?code=${code}` if no identity found. Polls `/api/game` every 30 s as Pusher fallback.
- `src/components/player/PlayerSubmit.tsx` — Card selection + explanation. Horizontal scroll tray; 160×214 card images; word counter (25-word cap); bonus point hint (≤1 sentence).
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
- `src/app/layout.tsx` — Loads Bebas Neue, Inter, Noto Sans Devanagari from Google Fonts as CSS custom properties: `--font-bebas`, `--font-inter`, `--font-devanagari`.
- `src/app/globals.css` — `@keyframes slide-up`, `@keyframes fade-in`, `.animate-slide-up`, `.animate-fade-in`.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PUSHER_KEY` | Yes | Pusher client key |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Yes | e.g. `ap2` (Mumbai) |
| `PUSHER_APP_ID` | Yes | Pusher server-side |
| `PUSHER_SECRET` | Yes | Pusher server-side |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL; falls back to in-memory |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token |
| `ANTHROPIC_API_KEY` | No | Claude judge; falls back to random |
| `ADMIN_USERNAME` | No | Admin dashboard Basic Auth |
| `ADMIN_PASSWORD` | No | Admin dashboard Basic Auth |

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

11. **Timer never auto-expired without projector** — `timer-expire` required a valid `hostId` match; projector without `?h=` silently dropped it. Fixed: removed `hostId` requirement from `timer-expire`; server-side guards (phase check + elapsed timer + distributed lock) are sufficient. Also added independent timer scheduling to PlayerView so the timer fires even if projector isn't open.

12. **Players could join in `game-over` phase** — Late joiners appeared on final leaderboard with 0 points. Fixed: `join` now blocks `game-over` in addition to `submission`.

13. **`getRoomChannel` missing `.toUpperCase()` on server** — Client uppercased the code; server didn't. Latent channel mismatch on mixed-case codes. Fixed: added `.toUpperCase()` to server-side `getRoomChannel`.

14. **Color inconsistency `#0d1b2e`** — Background color was `#0d1b2e` in several files (globals.css portrait-lock, EmotePanel, ChatPanel, admin pages, how-to-play). Canonical is `#0d1b35`. Fixed across all files.

15. **Round counter showed `0/N` in lobby** — `PlayerView` and `HostOverlay` both showed round counter before game started. Fixed: hidden when `phase === 'lobby' || round === 0`.

16. **`ProjectorView` / `HostDashboard` stalled on 404** — If room was deleted, both showed infinite spinner. Fixed: added `roomMissing` state with a "Room Closed" screen.

17. **Reveal pacing ignored player count** — Sequential card reveal always used 1800 ms delay regardless of how many players there were. Fixed in `ProjectorReveal`: scales to 1800/1200/900 ms for ≤4/≤8/9+ players.

---

## Known Issues / What Still Needs Fixing

### Functional
- **No reconnection handling for incognito** — If a player opens the room in a private/incognito window and refreshes, localStorage is gone and they're redirected to the home screen. They must re-join with the same name (gets a new playerId, appears as a duplicate). No fix currently.

### Infrastructure
- **In-memory fallback doesn't work across serverless instances** — In production (Vercel), multiple instances will not share the `devStore` Map. Upstash Redis is required for production.
- **No room cleanup UI** — Rooms expire after 24 hours via Redis TTL but stale rooms accumulate. Admin route can list active codes but there's no delete button. Auto-shutdown (`shutdownAt`) covers idle rooms after 5 min, but rooms can still linger if players stay connected.

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
