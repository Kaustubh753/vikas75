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
Best-effort in-memory `rateLimit(key, max, windowMs)` (not shared across serverless instances). Derive the client key from `getIp(req)`, which reads `x-real-ip` (Vercel edge, unspoofable) and the **last** `x-forwarded-for` value — never the first, which is client-controlled and trivially spoofable. Note: emote/chat buckets are keyed on `playerId` **on purpose** — all players share one venue Wi-Fi, so IP-keying would make them share a quota.

### 4. Revision counter — clients must drop stale snapshots
`GameRoom.rev` is a monotonic write counter bumped inside `setRoom` (concern #2's lock guarantees no race on it). Clients receive room state from **two channels** — the Pusher broadcast and the GET poll — and a slow poll can resolve *after* a newer broadcast. Both `PlayerView` and `ProjectorView` therefore guard every `setRoom(...)` with a `staleRoom(prev, next)` check that discards any snapshot whose `rev` is lower than what's already in state (rooms without a `rev` always apply, for legacy/back-compat). Without this the visible phase flickers backwards (e.g. `winner → judging`). **Any new client surface that consumes room state from both channels must apply the same guard.**

### Input sanitization
User text is cleaned before storage: `sanitizeName()` (length/trim) and `filterText()` (profanity/junk) on names and chat. Settings actions clamp `totalRounds`/`timerDuration` server-side — never trust the slider values as sent.

### Full POST action list
`create-room`, `join`, `advance`, `update-settings`, `submit`, `timer-expire`, `emote`, `chat`, `heartbeat`, `end-game`, `music-toggle`, `kick-player` — plus `GET ?code=&me=`. (The File Map below details the core game actions; the rest follow the same lock + token/host-gate pattern.)

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
  - `applyVerdict(room, verdict)` — awards each ranked player by placement (**1st=3, 2nd=2, 3rd=1**, others 0) plus **+1 per player whose `bonusPoint` is true**; the winner's `roundsWon` is incremented (that count, not total score, decides the overall game winner); sets `phase: 'winner'`. A `noWinner` verdict has empty rankings → nobody scores. Not internally idempotent, but every caller re-checks `phase === 'judging'` under the lock first, so it never double-applies.
  - `advancePhase(room)` — state machine dispatcher; `judging` phase does nothing (AI handles it)
  - `allPlayersSubmitted(room)` — true when every player who joined *before* this round has submitted (excludes mid-round late joiners)
  - `getLeaderboard(room)` — sorted player array

- `src/lib/redis.ts` — Transparent Redis / in-memory fallback.
  - Uses module-level `Map` when `UPSTASH_REDIS_REST_URL` is absent (local dev)
  - Lazily requires `@upstash/redis` to avoid startup crash without env vars
  - TTL: 24 hours
  - `setRoom` **bumps `room.rev`** (monotonic write counter) on every write — see the *Revision counter* cross-cutting concern. It mutates the passed object, so the same reference broadcast right after carries the new `rev`.
  - Exports: `getRoom`, `setRoom`, `deleteRoom`, `listActiveRooms`, plus `acquireLock`/`releaseLock` (used by `withRoomLock`).

- `src/lib/pusher.ts` — `pusherServer` (server-side SDK), `getRoomChannel(code)` → `private-game-${code.toUpperCase()}`, `broadcastRoom`/`triggerEvent`. `pusherServer` is **`null` when the `PUSHER_*` env vars are absent** (constructing the SDK without them throws at import). In that state `triggerEvent` no-ops and the auth route returns 503, so real-time silently degrades to polling — mirroring the Redis in-memory fallback. (Client singleton lives in `pusher-client.ts`, not here.)

- `src/lib/ai-judge.ts` — Dual-mode judge.
  - Live model id is `JUDGE_MODEL = 'claude-sonnet-4-6'` (used when `ANTHROPIC_API_KEY` present). This is the current Sonnet 4.6 id — do not "correct" it to an older dated id.
  - The judge **ranks all submissions** and returns per-player `gamePoints` (1st=3, 2nd=2, 3rd=1); `applyVerdict` consumes that.
  - Falls back to `fallbackJudge()` (random winner + Hindi-flavoured verdicts) when the key is absent, and **silently** if the live call throws/times out (8s `AbortController`) or returns unparseable JSON.
  - Strips accidental markdown fences before `JSON.parse`; `buildVerdict` rejects a verdict that names an unknown `playerId`.
  - Bonus rule on the **fallback** path: `explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1`. On the **live** path the model supplies `bonusPoint` directly (same one-sentence intent, not server-recomputed).

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
- `src/app/host/[code]/page.tsx` — **Redirects** to `/projector/[code]?h=[hostId]` — the projector view already renders the full host control bar (`HostOverlay`), so the host sees the same screen as the big display.
- `src/app/room/[code]/page.tsx` — Player room. Passes `code` to `<PlayerView>`.
- `src/app/projector/[code]/page.tsx` — Projector. Passes `code` to `<ProjectorView>`.
- `src/app/admin/page.tsx` — Admin login.
- `src/app/admin/dashboard/page.tsx` — Admin dashboard.

### Host Components
- `src/components/projector/HostOverlay.tsx` — Fixed bottom control bar rendered on the projector when `?h=[hostId]` is present. Accepts `hostId` as prop (from URL, not localStorage). Phase-appropriate advance button, error display, lobby settings panel (rounds/timer sliders), music toggle, end-game confirm, and a **players panel with per-player Kick** (`kick-player` action, host-gated). Sends `hostId` on every host action.

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
Buttons are styled inline per-component — there is **no shared `Button` primitive**. App-wide visual concerns live in `globals.css` (focus-visible rings, `prefers-reduced-motion` collapse, iOS input-zoom guard, safe-area padding, keyframes/animation utilities). The `ui/` directory holds:
- `CodeInput.tsx` — OTP-style 4-box room code input. `onChange` for mobile compatibility (IME-safe); `onKeyDown` for backspace navigation; `onPaste` fills all boxes; `onFocus` selects content; `caret-transparent` hides cursor.
- `AvatarPicker.tsx`, `CardBack.tsx`, `Confetti.tsx`, `ConnectionBanner.tsx`, `CountUp.tsx`, `LogoLockup.tsx`, `MuteButton.tsx`, `SkeletonCard.tsx`, `SocialLinks.tsx`, `ToasterProvider.tsx`.

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

18. **Fallback poll thundering herd** — With no player cap, a large room drops to polling once Pusher's payload limit is hit; all clients polled on the same 3 s beat. Fixed: per-client random jitter on the poll interval in `PlayerView`/`ProjectorView`.

19. **Phase flickered backwards on the client** — A slow GET poll resolving after a newer Pusher event reverted the visible phase. Fixed via the `rev` revision counter + `staleRoom` guard (see cross-cutting concern #4).

20. **Unhandled rejection in `submit` auto-advance** — The `after()` background task that advances `submission → reveal` had no try/catch (unlike `advance`'s `triggerJudge().catch`), so a Redis blip became an unhandled rejection and the phase silently stalled. Fixed: wrapped it; `timer-expire` is the fallback.

21. **Pusher crashed the API when unconfigured** — `pusherServer` was built at import with non-null-asserted env vars; missing vars threw and 500'd all of `/api/game`. Fixed: construct only when configured, otherwise `null` + no-op broadcasts (degrade to polling).

---

## Known Issues / What Still Needs Fixing

### Functional
- **Reconnection is by stale-seat reclaim, not durable identity** — A player who loses localStorage (e.g. closes an incognito window) and re-joins with the **same name** reclaims their existing seat — preserving score/hand/`joinedRound` — *provided that seat has gone stale* (no heartbeat for >45 s; see the `join` handler's reclaim block and `JoinClient.tsx`'s `reclaimedPlayerId` adoption). The remaining edge: if they re-join within 45 s (seat still "fresh"), reclaim doesn't fire and they briefly appear as a duplicate until the old seat ages out. Two players sharing a name is likewise ambiguous (first stale match wins).

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
