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
npx tsc --noEmit     # type-check only
npm run test:judge   # plain-node unit tests for the AI judge's pure logic (src/lib/judge-core.ts); needs Node ≥ 22.18

node scripts/build-scheme-details.mjs <pages-dir>   # asset-only: rebuild public/scheme-details/*.webp
```

There is **no test framework**. The one automated test is `npm run test:judge` — a plain-node script (`scripts/test-judge-core.mjs`, no runner, no API key; Node ≥ 22.18 for native type stripping, declared in `engines`) covering the AI judge's pure logic in `src/lib/judge-core.ts`: label assignment, permutation schedule, reply validation, cross-call aggregation and label scrubbing, including a position-bias oracle that proves submission order cannot decide a round. Everything else is verified by `npm run build` (which type-checks), `npm run lint`, and manual play-testing across the three windows described in *Running Locally*. `.github/workflows/ci.yml` runs lint, tsc, the judge tests and the build on every push. Don't reference a broader test suite that doesn't exist.

`scripts/build-scheme-details.mjs` is a hand-run asset step, not part of the build or CI: it re-encodes the Explore scheme guides from a folder of exported PDF pages (`page02.jpg`…, matching the PDF's own page numbers) and exits non-zero if `src/lib/scheme-details.ts`'s id list has drifted from `context/scheme_details_map.json`. It imports `sharp`, which is not a declared dependency — it is present only transitively via Next.

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
- The client keeps those per-player tokens in **per-room seat records** (`src/lib/seat-storage.ts`) — that is what makes reconnection durable: a returning device presents its old `playerId` + token and the idempotent-rejoin branch hands back the exact seat in any phase. Tokens live in localStorage only; never put one in a URL.

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
  - `startRound(room)` — increments round, picks a challenge card, resets submissions. Hands persist across rounds (a played card is gone for good); only an empty hand is refilled
  - `startSubmission(room)` — sets `timerEndsAt = now + timerDuration` (default 60 s, host-adjustable)
  - `addSubmission(room, submission)` — idempotent add to submissions map
  - `applyVerdict(room, verdict)` — awards each ranked player by placement (**1st=3, 2nd=2, 3rd=1**, others 0) the winner's `roundsWon` is incremented (that count, not total score, decides the overall game winner); sets `phase: 'winner'`. A `noWinner` verdict has empty rankings → nobody scores. Not internally idempotent, but every caller re-checks `phase === 'judging'` under the lock first, so it never double-applies.
  - `advancePhase(room)` — state machine dispatcher; `judging` phase does nothing (AI handles it)
  - `allPlayersSubmitted(room)` — true when every player who joined *before* this round has submitted (excludes mid-round late joiners)

- `src/lib/redis.ts` — Transparent Redis / in-memory fallback.
  - Uses module-level `Map` when `UPSTASH_REDIS_REST_URL` is absent (local dev)
  - Lazily requires `@upstash/redis` to avoid startup crash without env vars
  - TTL: 24 hours
  - `setRoom` **bumps `room.rev`** (monotonic write counter) on every write — see the *Revision counter* cross-cutting concern. It mutates the passed object, so the same reference broadcast right after carries the new `rev`.
  - Exports: `getRoom`, `setRoom`, `deleteRoom`, `listActiveRooms`, plus `acquireLock`/`releaseLock` (used by `withRoomLock`).

- `src/lib/pusher.ts` — `pusherServer` (server-side SDK), `getRoomChannel(code)` → `private-game-${code.toUpperCase()}`, `broadcastRoom`/`triggerEvent`. `pusherServer` is **`null` when the `PUSHER_*` env vars are absent** (constructing the SDK without them throws at import). In that state `triggerEvent` no-ops and the auth route returns 503, so real-time silently degrades to polling — mirroring the Redis in-memory fallback. (Client singleton lives in `pusher-client.ts`, not here.)

- `src/lib/seat-storage.ts` — **Client** half of durable reconnection: per-room seat records in localStorage (`vikas75_seat_<CODE>` = playerId + token + name + avatar). `loadSeat`/`saveSeat`/`clearSeat` plus `seatToken(code)` **and `seatPlayerId(code)`** — every call-time identity read in PlayerView must go through these, never the shared globals, so two tabs in two rooms each send their own room's id *and* token. (Mixing them is what froze a hand and could eject a seated player; see bug #24.) Legacy global keys (`vikas75_playerId`/`vikas75_token`/…) are still written alongside for older readers; the room record wins wherever both exist. All access is try/caught — blocked storage degrades to the old name-based reclaim.

- `src/lib/share-card.ts` — Client-side canvas generator for the shareable result PNG (1080×1350, WhatsApp's 4:5). Draws the final podium + compact rest-of-table (the sharer's own row is always included), and a joint-champions header when the top is tied — matching `ProjectorGameOver`, so the card never crowns one of two tied players. Uses the page's real fonts (read from **`document.body`**, where the root layout's `next/font` variable classes live — reading `documentElement` silently yields `""` and renders everything in generic sans-serif) after `document.fonts.ready`, so Devanagari names render; text truncation cuts whole code points so an emoji name can't end in a tofu box and same-origin `/avatars/*.webp` (fail-soft initial disc). Only data every client already sees — never hands/tokens.

- `src/lib/judge-core.ts` — **Pure** judge logic (no I/O, no SDK, no `@/` imports — the test imports it directly). Seeded FNV-1a/mulberry32 shuffle; `assignLabels` (players → random `ANS-nn` labels drawn from a 90-label pool, canonicalised by playerId so submission order can't leak); `makeCallOrders` (one seeded shuffle, three rotations at offsets 0/⌊N/3⌋/⌊2N/3⌋ — two answers get the shuffle and its reverse, one answer gets a single call); `buildUserMessage` (no names/ids/times, explanation in `<<< >>>` with `<>` and `==` runs stripped so a player can't forge a block or close the markers, per-answer on-brief yes/no computed by card id); `CALL_SCHEMA` (static structured-output schema: per answer `fit` and `why` **before** `judgeScore`, then a private `decider` **before** `winner`); `parseCallResult` (a missing, unknown or duplicated label or a non-integer/out-of-range score rejects the whole call; soft repairs reported as notes); `aggregateCalls` (winner = most first-place votes → mean score → mean rank → seeded coin; everyone else by mean score; stars are the mean to 1 dp, winner never displayed below the runner-up); `assembleVerdict` (identity fields copied from the server's Submissions, consensus call's comments/narrative, any stray `ANS-nn` scrubbed to `the <scheme> answer`); `deadlineMsFor`/`maxTokensFor`, `JUDGING_LOCK_TTL_MS`, `isStructuredOutputRejection`.

- `src/lib/ai-judge.ts` — Dual-mode judge; the live path is a **debiased, multi-call** judge.
  - Live model id is `JUDGE_MODEL = 'claude-sonnet-5'` (used when `ANTHROPIC_API_KEY` present) — the cost-efficient Sonnet, an owner decision after trying Haiku. Never append a date suffix to the id. **Two Sonnet 5 requirements are baked into the code:** the request sends `thinking: { type: 'disabled' }` explicitly (omitting the param runs adaptive thinking on this model, which would blow the deadline), and `maxTokensFor` is sized for its ~30%-heavier tokenizer. Revisit both if the model ever changes.
  - **Why it is built this way:** the old single call listed answers in submission order, numbered 1..N with player names, and demanded a score-sorted JSON list — a textbook LLM position bias, and the fastest submitter won far too often. Now the model never sees names, ids or times (players are random `ANS-nn` labels), K parallel calls each see a different rotation of one seeded shuffle, each answer must be reasoned about (`fit`, `why`) before it is scored and a private `decider` written before the crown, the rubric caps an on-brief card with a generic explanation at 5–6 (below a well-argued stretch — playing the obvious card fast is not an argument), and the calls are aggregated by first-place votes then mean score (`judge-core.ts`). Nothing in the pipeline keys on `submittedAt` or player-id order — not even tie-breaks (a seeded coin).
  - Calls use **structured outputs** (`output_config.format`, schema `CALL_SCHEMA`) — Sonnet 5 is on the documented supported-models list. If the API ever rejects the parameter (400 naming `output_config`), the process flips to plain JSON once and logs `structured outputs rejected … switching to plain JSON`; the reply is validated in code either way.
  - Budgets scale with the table: one absolute deadline `min(22s, 9s + 0.65s/answer)` shared by all parallel calls **and** the plain-JSON retry (SDK retries are **disabled** and every call is raced against the deadline, because the SDK sleeps on a `retry-after` header without honouring the abort signal); `max_tokens = 500 + 130/answer` (90 above `BRIEF_THRESHOLD` = 10 answers, where the prompt also caps `why`/`judgeComment` at 8 words). Output tokens are the slow part (~70/s), so **keep the deadline under the `lock:judging:` TTL in `route.ts` (30s)** or a slow round can be double-fired by the kick-judge watchdog; `route.ts` also sets `maxDuration = 60` so the `after()` background work outlives the response.
  - A call that times out, is truncated (`max_tokens`), refuses, returns non-JSON, or fails validation is **dropped and the others carry the round** (`[ai-judge] call N dropped: …`, `degraded: k/K calls valid`). Only when none survive does it fall back to `fallbackJudge()` (random winner via a real Fisher–Yates — the old comparator shuffle favoured submission order — plus Hindi-flavoured verdicts), the same fallback used when the key is absent. Nothing on the projector distinguishes a fallback verdict from a real one — check the Vercel logs for `[ai-judge] Live verdict via …` (player count, calls valid, mode, latency, winner votes) vs `[ai-judge] Claude call failed/timed out` (fallback). Every line carries a `[CODE:round]` tag; `seed … labels ANS-42=<playerId>,…`, per-call `call i/K ok … top=<label> winnerPos=<position>/N` (a `winnerPos` that clusters at 1 over many rounds is residual primacy) and `final: <label>:<mean>/<votes>/<rank>` let you reconstruct any disputed verdict.
  - Labels are scrubbed from on-screen text (`ANS-42` → `the <scheme> answer`, in any casing or spelling the parser would accept); comments and the narrative come from the call that crowned the final winner, so the story on screen always matches the crown.
  - Two rubric rules are enforced in code, not just prose (`parseCallResult`): a blank explanation scores at most 2, and a stated winner the same call scored below its own top answer is discarded for that top score.
  - Cost: three calls per round instead of one, at Sonnet 5 rates — about 9¢ for a 3-round game with 5 players, ~6–7¢ per round at a full 20-player table. The ~2k-token system prompt is sent with `cache_control` and clears Sonnet 5's 1024-token cache minimum, so repeat rounds read it from cache (`cacheRead=` in the per-call log shows the hit rate). The problem↔scheme mapping is compiled once at module load into an in-memory cache (`ON_BRIEF_BY_CHALLENGE`) and never enters the prompt — each answer carries only an ~8-token yes/no flag, vs ~350 tokens to paste the mapping.

- `src/lib/scheme-details.ts` — Which scheme cards have a full infographic guide in `public/scheme-details/`. `hasSchemeDetail(id)` gates the Explore entry point; `schemeDetailImage(id)` returns `/scheme-details/<id>.webp` or **`null`** when there is none. The id list is explicit rather than "assume every card has one": `s018` (Digital India) has no matching page in the source deck, and a missing image would otherwise render as a broken box inside the sheet — callers must treat `null` as "no guide" and hide the entry point. `scripts/build-scheme-details.mjs` fails if this list drifts from `context/scheme_details_map.json`.

### API
- `src/app/api/game/route.ts` — Single POST + GET endpoint.
  - `create-room` — creates room, returns `{ room }`
  - `join` — blocks during `submission` and `game-over` phases; idempotent on rejoin (returns existing room)
  - `advance` — advances phase; if `hostId` present in body, validates it against `room.hostId`; fires `triggerJudge()` via `after()` when entering `judging`
  - `submit` — adds submission; auto-advances to `reveal` if all players submitted
  - `GET ?code=XXXX` — returns current room state

- `src/app/api/admin/route.ts` — Basic Auth (env vars `ADMIN_USERNAME`/`ADMIN_PASSWORD`). `GET ?action=rooms` lists active room codes.
- `src/app/api/assetlinks/route.ts` — Serves the Android TWA's Digital Asset Links JSON, driven by `TWA_PACKAGE_NAME` + `TWA_SHA256_CERT_FINGERPRINTS` env. `next.config.ts` rewrites `/.well-known/assetlinks.json` here. Empty array (valid) until configured. See `apk/`.

### Android app (TWA wrapper)
- `apk/twa-manifest.json` + `apk/README.md` — Bubblewrap config and build guide that wrap the **deployed** site as an installable Android app (Trusted Web Activity). The app is server-rendered, so the APK is a thin Chrome shell pointing at the live host, not a bundle. `.github/workflows/android-apk.yml` builds/signs the APK in CI. Generated project files and keystores are git-ignored; only the manifest and README are tracked.

### Pages (all async, all await params/searchParams)
- `src/app/page.tsx` — Home. Passes `initialCode` from `searchParams.code` to `<HomePage>`.
- `src/app/host/[code]/page.tsx` — **Redirects** to `/projector/[code]?h=[hostId]` — the projector view already renders the full host control bar (`HostOverlay`), so the host sees the same screen as the big display.
- `src/app/room/[code]/page.tsx` — Player room. Passes `code` to `<PlayerView>`.
- `src/app/projector/[code]/page.tsx` — Projector. Passes `code` to `<ProjectorView>`.
- `src/app/admin/page.tsx` — Admin login.
- `src/app/admin/dashboard/page.tsx` — Admin dashboard.

### Host Components
- `src/components/projector/HostOverlay.tsx` — Fixed bottom control bar rendered on the projector when `?h=[hostId]` is present. Accepts `hostId` as prop (from URL, not localStorage). Phase-appropriate advance button, error display, lobby settings panel (rounds/timer sliders), end-game confirm, a **players panel with per-player Kick** (`kick-player` action, host-gated), and — on mobile hosts (≤768px, the same breakpoint at which `ProjectorView` hides the floating `MuteButton`) — a **music toggle** that sends the host-gated `music-toggle` action to remote-mute the projector. Sends `hostId` on every host action.
- `src/components/projector/MobileHostContent.tsx` — Portrait-native, read-only game-state view rendered by `ProjectorView` instead of the 16:9 TV phase layouts when the host is on a phone (`isHost && isMobileHost`). Controls still come from `HostOverlay`, rendered alongside it.

### Player Components
- `src/app/page.tsx` — Home page (join/create screen). Stores `vikas75_playerId`, `vikas75_playerName`, `vikas75_avatarId` in localStorage on join. Host redirected to `/host/[code]?h=[hostId]`. The 4-box room-code input lives inline in `src/app/join/JoinClient.tsx` (it needs live slot measurements for the join "turn" animation — there is no shared CodeInput component). JoinClient prefills the name from the room's saved seat and, when the typed name matches it, joins with the saved `playerId` + token so the server returns the exact old seat instantly, in any phase; a 403 (rotated token) drops the record and retries once as a fresh joiner.
- `src/components/player/PlayerView.tsx` — Player state machine. Hydrates identity in `useEffect` only (avoids hydration mismatch), preferring this room's seat record over the legacy global keys (and syncing the legacy keys from it); redirects to `/join?code=…` when no identity exists. A seated player refreshing at `game-over` stays on the final screen — only a visitor who was never in the room is redirected home. Polls `/api/game` every 30 s as Pusher fallback.
- `src/components/player/PlayerScorecard.tsx` — The player's own line from the verdict on the winner screen: placement, fractional stars from the 1-decimal `judgeScore` (same math as ProjectorWinner's `Stars`), round points and the judge's one-liner; a quiet "sat this round out" card when they're not in the rankings.
- `src/components/player/PlayerGameOver.tsx` — Phone end-of-game screen: champion strip + own placement (ranking mirrors `ProjectorGameOver`: roundsWon → score → id), and the **Share result** flow — builds the PNG via `share-card.ts`, hands it to `navigator.share` (Android/TWA opens straight into WhatsApp; backing out is not an error), else shows a long-press/download preview overlay.
- `src/components/player/PlayerSubmit.tsx` — Card selection + explanation. Horizontal scroll tray; 160×214 card images; word counter (25-word cap).
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

### Explore Components
- `src/components/explore/ExplorePage.tsx` — "Know Your Deck" browser over the 75 scheme cards. Its `CardModal` shows the card image, name/Hindi/description/key points and — only when `hasSchemeDetail(card.id)` — a **Full scheme guide** button that mounts `SchemeDetailSheet` above it. The button is hidden rather than disabled for cards without a guide.
- `src/components/explore/SchemeDetailSheet.tsx` — Full-screen sheet showing the office's own one-page infographic for a scheme (what it is, key features, how to apply, official portal link). A scroll container, not a fitted panel: the image is tall portrait, read top-to-bottom at full width on a phone and centred at 820 px on desktop. Two things to preserve:
  - Escape is bound in the **capture** phase (`addEventListener(…, true)` + `stopPropagation`) because `CardModal` underneath also closes on Escape — without capturing, one keypress dismisses both.
  - The loading placeholder must **never** be `display: none` on the `next/image` element. These images lazy-load through an intersection observer, so a hidden image never enters the viewport, never loads and never fires `onLoad` — it deadlocks in the placeholder forever. The skeleton is a `skeleton-pulse` background on the *wrapper* and the image fades in on `opacity` instead. `priority` is deliberately off: a ~160 KB guide is fetched only when someone opens the sheet.

### UI Components
Buttons are styled inline per-component — there is **no shared `Button` primitive**. App-wide visual concerns live in `globals.css` (focus-visible rings, `prefers-reduced-motion` collapse, iOS input-zoom guard, safe-area padding, keyframes/animation utilities). The `ui/` directory holds:
- `AvatarPicker.tsx`, `CardBack.tsx`, `Confetti.tsx`, `ConnectionBanner.tsx`, `CountUp.tsx`, `LogoLockup.tsx`, `MuteButton.tsx`, `SocialLinks.tsx`, `ToasterProvider.tsx`.
- The OTP-style 4-box room-code input is **not** here — it lives inline in `src/app/join/JoinClient.tsx` (see Player Components above).

Loading states are **not** generic skeletons: `ProjectorLoading.tsx` and `PlayerLoading.tsx` are low-fidelity ghosts of `ProjectorLobby`/`PlayerLobby` — same tile, seat and QR dimensions in the same positions — so the room resolving fills the layout in rather than replacing it. Their sizing expressions are duplicated from the lobby components; change one, change the other.

### Cards
- `context/cards_challenges.json` — 30 challenge cards (c001–c030). Fields: `id`, `en`, `hi`, `icon`.
- `context/cards_schemes.json` — 75 scheme cards (s001–s075). Fields: `id`, `name`, `hi`, `desc`, `bullets[]`.
- `context/scheme_details_map.json` — PDF page → scheme id for the Explore scheme guides. The source deck's 75 scheme pages (page 1 is a cover) yield 74 mapped ids: page 17 is the *Digital India Internship Scheme*, far narrower than the deck's broad Digital India card, so `s018` is intentionally unmapped and has no guide. Page order does **not** track card order (page 4 is `s010`), so the mapping is per-page, not an offset.
- `public/scheme-details/<schemeId>.webp` — the 74 per-scheme infographics, 900 px wide at webp q72 (~160 KB each, ~12 MB total). Not preloaded; one is fetched only when its sheet is opened. Regenerate with `scripts/build-scheme-details.mjs` (see *Commands*) — the 15 MB source PDF is deliberately not in the repo, only these derived images.
- There is **no shared card component** — cards render as pre-baked webp images (`public/cards/card-001..105.webp`) via `next/image`, with the id→image mapping in `src/lib/cards.ts` (`getChallengeCardImage`/`getSchemeCardImage`), inline in each consumer (`PlayerSubmit`, `PlayerChallengeReveal`, `ProjectorChallengeReveal`, `ProjectorReveal`, `ExplorePage`).

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

24. **Cross-room identity bleed froze hands and could eject a seated player** — After the seat store landed, `fetchRoom`/the Pusher handler still read the *shared* `vikas75_playerId` global while sending this room's token. With two rooms open on one device the poll asked for the other room's id: the server scrubbed the caller's own hand from the reply (unknown `me`), so the hand froze at the join snapshot, and the game-over guard saw a stranger and ejected a seated player, deleting their seat record. Fixed: `seatPlayerId(code)` pairs the id with the token at every call site.

23. **Refreshing on the final screen ejected a seated player** — `fetchRoom`'s finished-game guard redirected anyone whose page loaded fresh into `game-over`, including players who were in the game all along — they never saw the podium or the share card. Fixed: the redirect now applies only to visitors who are not in `room.players`.

22. **AI judge favoured the fastest submitter** — Submissions reached Claude in submission order, numbered and named, with a "JSON only, sorted by score" contract, so the first-listed answer won far more often than it deserved (LLM position bias) and nothing forced the model to reason before scoring. Fixed: anonymous random labels, three parallel calls over different rotations of a seeded shuffle, reason-before-score fields, vote/mean aggregation with a seeded tie-break, structured outputs with a plain-JSON degrade, per-call drop instead of whole-round fallback — see `judge-core.ts` and `npm run test:judge`.

---

## Known Issues / What Still Needs Fixing

### Functional
- **Reconnection is durable per device, name-based only across devices** — The same device always finds its way back to its exact seat (any phase, no wait): the per-room seat record (`seat-storage.ts`) presents the old `playerId` + token and the server's idempotent-rejoin branch returns the seat. The name-based stale-seat reclaim (>45 s, fresh token issued) remains the fallback for a device that genuinely lost its storage or a player switching phones. Residual edges: a storage-wiped device rejoining within 45 s still appears as a duplicate until the old seat ages out, and two players sharing a name are still ambiguous to the fallback (first stale match wins).

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
