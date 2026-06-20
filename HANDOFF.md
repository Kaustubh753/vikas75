# Session Handoff — Full Context & Thought Process

This document carries the **complete reasoning** behind recent work so a fresh Claude Code
session (on any account) can resume with the same mental model the previous session had —
not just *what* changed, but *why*, what was tried and rejected, and how things were verified.

Read order for a new session: **this file → `CLAUDE.md` → `AGENTS.md`**.
- `CLAUDE.md` = the standing developer guide (architecture, file map, env vars, bug history #1–#17).
- `AGENTS.md` = a warning that this is a **modified Next.js (v16, Turbopack)** with breaking
  changes; read `node_modules/next/dist/docs/` before writing Next.js code.
- This file = the narrative + reasoning that commit messages and `CLAUDE.md` don't fully capture.

---

## 0. Project in one paragraph

**Vikas 75** is a multiplayer party game about Indian government schemes. Players use phones
as controllers; a host laptop drives the game; a TV/projector shows the public screen. Each
round a *challenge card* is shown, players pick a *scheme card* from their hand and write a
≤25-word justification, and an AI judge (Claude, or a random fallback) picks a winner. All
state lives in a single `GameRoom` object in Redis (or an in-memory `Map` in dev). Every
mutation writes the room and broadcasts the **full** room over Pusher; clients replace local
state wholesale — no diffing. Stack: Next.js 16 App Router + Turbopack, Pusher (real-time),
Upstash Redis (persistence, 24 h TTL), `after()` for post-response async work.

**Game phases:** `lobby → challenge-reveal → submission → reveal → judging → winner →`
`(between-rounds → repeat | game-over)`. The host advances every step manually via
`POST /api/game {action:'advance'}`, **except**: (a) `submission → reveal` auto-advances when
everyone has submitted, and (b) `judging` is fully automated — entering it fires
`triggerJudge()` via `after()`, which judges and advances to `winner`.

---

## 1. Chronology of recent work (newest first)

### Completion pass — Milestone 1: playable-v1 hardening (this session)

Goal of the session: take the game from "works" to complete/polished/shippable, in
milestones. M1 closed the broken/silent/duplicate gaps.

- **ESLint migration (`5565f6c`).** `next lint` is removed in Next 16 and the repo had
  no ESLint config or dependency — lint was broken. Added `eslint` +
  `eslint-config-next`, an `eslint.config.mjs` flat config (core-web-vitals + typescript),
  and a `lint` script. `eslint-config-next@16` ships the React-Compiler-era react-hooks
  rules (purity / refs / set-state-in-effect) as *errors*; they flag intentional patterns
  here (live `Date.now()` in render for timers, ref-as-mount-snapshot, ref-mirror-of-state,
  and the hydration-safe `setState`-in-effect that fixes bugs #9/#10 — converting that to
  lazy initial state would reintroduce the SSR mismatch). Set those advisory rules to
  `warn` with a documented rationale, fixed the genuine hygiene issues (unused vars,
  `Math.random` in render → lazy `useState`). Result: `npx eslint .` exits 0.

- **Procedural SFX fallback (`21c0e12`).** Projector phase stings
  (challenge/ticking/drumroll/winner) referenced mp3s that don't ship — only `lobby.mp3`
  exists — and the coded tone fallback was never called, so the projector was silent.
  `music.ts` now tries the real mp3 first (drop-in upgrade path) and synthesises a
  Web-Audio fallback on load error. Public API unchanged.

- **Reconnection + best-effort broadcasts (`a402b72`).** Join now reclaims a *disconnected*
  same-name seat (preserving score/hand) instead of creating a duplicate (HANDOFF §3 #1);
  only stale seats are reclaimable so active players aren't hijacked. While verifying this
  the curl harness surfaced that **every** mutating request was 500ing: `broadcastRoom`
  and the emote/chat/music triggers called `pusherServer.trigger()` unwrapped, so a Pusher
  failure (here: this env's egress policy blocks `api-ap2.pusher.com`) threw *after* the
  state was already persisted. Added a `triggerEvent()` best-effort wrapper and routed all
  broadcasts through it; clients fall back to their 30 s GET poll. A full 2-round game now
  runs to `game-over` via curl with joins returning 200.

  > Env note for testers: with dummy Pusher keys (or blocked Pusher egress) real-time
  > updates won't fire — clients rely on the 30 s poll. Supply real `*PUSHER*` secrets for
  > live sync. This is now graceful (no 500s) rather than fatal.

### 1.6 — Phase-stall fixes (`a98d296`) ← most important recent change

While testing the full game loop end-to-end (via `curl`, see §2), two independent
auto-advance bugs surfaced. Both are in `src/app/api/game/route.ts`.

**Bug A — submission phase never auto-advanced.**

`allPlayersSubmitted()` (in `src/lib/game-engine.ts`) decides when to leave `submission`:

```ts
const activePlayers = Object.values(room.players).filter(
  (p) => p.joinedRound < room.round && (!p.lastSeen || now - p.lastSeen < 45_000),
);
return activePlayers.length > 0 && activePlayers.every((p) => room.submissions[p.id]);
```

The 45 s `lastSeen` filter exists so a **dropped phone doesn't stall the round forever** —
a disconnected player is excluded rather than blocking the advance. The only thing that
refreshed `lastSeen` was the browser heartbeat (`PlayerView.tsx`, every 20 s) and `addPlayer`
(at join). **Nothing refreshed `lastSeen` when a player submitted.**

Consequence: mobile browsers throttle `setInterval` when a tab is backgrounded or the phone
locks. A player who submits and then locks their phone stops sending heartbeats; 45 s later
they're treated as disconnected. If *all* current submitters go stale, `activePlayers` is
empty → the function returns `false` → the `after()` auto-advance is **never even scheduled**,
and the phase sits in `submission` until the 90 s timer expires (or forever, in testing).

**The investigation had a false start worth recording:** the first hypothesis was that
`after()` simply doesn't run in Turbopack dev mode. That was **wrong** — `after()` works
fine (proven once Bug A was fixed; the advance fired at t≈2 s exactly as designed). The
second hypothesis was the `lastSeen` filter, which a fast curl test seemed to disprove
(both players still showed stale). The actual confirmation came from dumping the room JSON
and computing `lastSeen` age per player: both were `active=False` because nothing had
refreshed `lastSeen` since join, and real wall-clock time between orchestration steps had
exceeded 45 s. So the filter *was* the cause — the earlier "fast test" wasn't actually fast
enough relative to join time.

**Fix:** refresh `lastSeen` on submit, since submitting is *definitive* proof of presence:

```ts
const updated = addSubmission(room, safeSubmission);
if (updated.players[submission.playerId]) {
  updated.players[submission.playerId].lastSeen = Date.now();
}
await setRoom(updated);
```

This is correct beyond the test artifact: it hardens real gameplay against background-tab
heartbeat throttling on phones.

**Bug B — judging froze on every round after the first.**

`triggerJudge()` used a distributed lock to avoid double-judging if `after()` fired twice:

```ts
const lockKey = `lock:judging:${code}`;     // ← keyed only by room code
const acquired = await acquireLock(lockKey, 60);   // 60 s TTL, never released
if (!acquired) return;
```

The lock is acquired but **never released** — it just expires after 60 s. Round 1 grabs it,
judges, advances to `winner`, and leaves the lock held. When round 2 reaches `judging` (which
in fast play is well under 60 s later), `triggerJudge` can't acquire the lock, returns early,
and **no one judges**. Because `advancePhase()` is a deliberate no-op during `judging` (the
AI is supposed to handle it), every subsequent host "advance" is also a no-op — the game is
frozen at `judging`. In slow real-world play this is masked: a full round (challenge reveal +
90 s submission + reveal animation + winner screen) usually exceeds 60 s, so the lock expires
in time. It's a genuine latent bug that bites fast rounds.

**Fix:** scope the lock to the **round**, so each round gets an independent lock while still
guarding against double-fires *within* a round. The room must be read first to know the round:

```ts
const room = await getRoom(code);
if (!room || room.phase !== 'judging') return;
const lockKey = `lock:judging:${code}:${room.round}`;   // ← per-round
const acquired = await acquireLock(lockKey, 60);
if (!acquired) return;
```

Reading the room before acquiring is safe: two concurrent `after()` callbacks both read
`phase==='judging'`, both attempt the same per-round key, only one wins (atomic `SET NX`),
the loser returns. Double-fire protection preserved; cross-round blocking eliminated.

**Verification:** a full 3-round game was driven to `game-over` after the fix — every
`submission→reveal` and `judging→winner` transition fired (final scores Asha 9, Bharat 12).

### 1.5 — Landing page cleanup (`c8e44ae`)
Removed the "How to Play" link from the landing-page bottom strip, per request. Also removed
a now-dead `CodeInput` import from `src/app/page.tsx`.

### 1.4 — Ten-item cleanup pass (`f70e2ff`)
A deliberate sweep after a full-codebase audit. Each item and its rationale:
1. **og-image** — generated `public/og-image.png` (1200×630, via `sharp` from an SVG: dark
   navy bg, saffron glow, "VIKAS 75" wordmark, tagline, tricolour bar) and wired
   OpenGraph/Twitter card metadata in `layout.tsx` (`description: "The best answer isn't
   always right."`).
2. **Dead component** — deleted `src/components/host/HostDashboard.tsx`; it was never
   imported or rendered anywhere (host UI is `HostPanel`/host overlay).
3. **Music union** — removed the unused `'correct'` track from `TrackName` and `TONE_CONFIG`
   in `src/lib/music.ts`.
4. **Dead CSS** — removed unused `@keyframes card-flip`, `float-up`, `particle-float` and the
   `.animate-float-up` class from `globals.css`.
5. **Card-image dedup** — `ExplorePage.tsx` had an inline `cardImageUrl()` duplicating
   `@/lib/cards`; replaced with `import { getSchemeCardImage }`.
6. **how-to-play link** — (folded into 1.5 above).
7. **Team tab** — simplified the Explore "Team" tab to a centered "Coming soon." placeholder.
8. **Draft cleanup** — `PlayerView` now clears the `vikas75_draft_explanation` sessionStorage
   key on `game-over`.
9. **Admin "End Room"** — added `DELETE /api/game?code=XXXX`: Basic-auth gated with a
   **timing-safe** credential compare (`crypto.timingSafeEqual` over equal-length buffers),
   validates the 4-letter code, deletes the room from Redis, and fires a `game:room-closed`
   Pusher event. Paired UI in `src/app/admin/dashboard/page.tsx`: per-room "End Room" button
   with `endingRoom` state and toast feedback.
10. **Host controls / HostOverlay** — audited; no change needed.

### 1.3 — Ticker facts (`f95a9a9`)
Replaced placeholder "Did you know?" ticker text in the projector lobby with **20 verified
government-scheme statistics**.

### 1.2 — Restore lost branding (`522fed7`)
The redesign (1.1) dropped five elements from the old lobby; all were restored: **social
links**, the **"An initiative…" attribution**, the **"The best answer isn't always right."**
tagline, the **dynamic origin URL** (read from `window.location.origin` in `useEffect` to
avoid hydration mismatch — see `CLAUDE.md` bug #10), and the **saffron left-border logo unit**.

### 1.1 — Projector lobby redesign (`addff8a`)
Rewrote `src/components/projector/ProjectorLobby.tsx` from a design-system handoff (delivered
as a tar.gz HTML/CSS/JS prototype — the original hosted design URL was unreachable). Translated
into a React component using **inline `style={{}}` objects** (no Tailwind, matching the
projector/landing convention) and the project's design tokens:
- `#07101f` background, `#FF9933` saffron, `#138808` green, `#faf8f0` cream
- `clamp()` responsive typography; `var(--font-yatra/inter/bebas)`
- film grain via an SVG `feTurbulence` overlay; saffron radial gradient from top-centre

Layout: vertical flex — header → body (glass join-card + seat grid + banter) → footer →
ticker. The join-card shows a QR code (`qrcode.react`) with a "V·75" badge overlay and cream
playing-card letter tiles (per-tile rotation). `FilledSeat`/`OpenSeat` components resize by
viewport width / player count. Banter chips animate in as new players join, tracked via a
`prevIdsRef` Set diffed against the current player IDs.

### 1.0 — Earlier (pre-handoff) fixes still relevant
`0a7aac3` allow mid-submission joins + 2 s auto-advance delay; `c121d58` restored avatars
`a6`/`a9` to the server allowlist. Full bug history is `CLAUDE.md` #1–#17.

---

## 2. Testing methodology (reusable)

The whole game was validated by driving the **live dev server** with `curl` — no browser
needed. Pattern:

```bash
npm run dev            # http://localhost:3000
API=http://localhost:3000/api/game
post(){ curl -s -X POST "$API" -H 'Content-Type: application/json' -d "$1"; }

# create room (capture .room.code), join players, advance, submit, poll phase
post '{"action":"create-room","hostId":"h1","hostName":"Host","totalRounds":3}'
post '{"action":"join","code":"XXXX","playerId":"p1","playerName":"Asha","avatarId":"a1"}'
# advance lobby→challenge-reveal→submission with {"action":"advance","code":"XXXX","hostId":"h1"}
# fetch each hand to get a real card id:
curl -s "$API?code=XXXX&me=p1"     # ?me=<pid> is REQUIRED or hands are stripped
post '{"action":"submit","code":"XXXX","submission":{"playerId":"p1","schemeCard":{"id":"s059"},"explanation":"..."}}'
```

**Gotchas learned the hard way:**
- `GET /api/game?code=XXXX&me=<pid>` — without `&me=`, player hands are stripped from the
  response, so you can't pick a real card and submit (first attempts 403'd on empty cards).
- **curl sends no heartbeats**, so test players go `lastSeen`-stale after 45 s. Submit within
  the window, or Bug A's symptom reappears as a *test artifact* (not a real regression).
- `after()` callbacks fire ~immediately after the HTTP response; the `submission→reveal`
  advance has a deliberate **2 s delay** so the projector shows the final submission tick.
- The fallback judge (no `ANTHROPIC_API_KEY`) returns instantly, so `judging→winner` is
  near-immediate in dev. The verdict lands in `room.lastVerdict`.

**Admin DELETE** was tested directly: no-auth → 401, bad code → 400, valid → 200 `{ok:true}`,
GET-after-delete → 404, delete-again → 404. Build sanity: `npx tsc --noEmit` passes.
(`eslint`/`next lint` currently errors on flat-config migration — `tsc` is the reliable gate.)

---

## 3. Known issues / not yet done
- **Incognito reconnection** — a player in a private window who refreshes loses localStorage
  identity and rejoins as a duplicate (new `playerId`). No fix yet. (`CLAUDE.md` Known Issues.)
- **In-memory store is single-instance** — production (Vercel) needs Upstash Redis; the dev
  fallback `Map` isn't shared across serverless instances.
- **ESLint** — config is old `.eslintrc` format; errors under ESLint 9's flat-config default.
  Use `npx tsc --noEmit` for type-checking until migrated.
- **`after()` reliability in serverless** — works in dev; verify auto-advance and `triggerJudge`
  behave on Vercel under real load (cold starts can delay `after()`).

---

## 4. Running locally
```bash
npm install
# create .env.local — see the env-var table in CLAUDE.md
npm run dev
```
Three windows: `/` (join/create), `/projector/<CODE>` (big screen),
`/host/<CODE>?h=<HOST_ID>` (host controls — link shown on join).

**`.env.local` is gitignored and does not travel with the repo.** Minimum to boot: the four
`*PUSHER*` keys. Optional: `UPSTASH_REDIS_*` (else in-memory), `ANTHROPIC_API_KEY` (else
random Hinglish verdict), `ADMIN_USERNAME`/`ADMIN_PASSWORD` (else admin dashboard + End Room
are disabled). The other Claude account that picks this up must re-supply these as secrets.

---

## 5. Git state at handoff
Branch `main`, pushed to `github.com/Kaustubh753/vikas75`. Latest commits:
```
docs: add HANDOFF.md …                         (this file)
a98d296 fix: stop submission and judging phases from stalling
c8e44ae remove How to Play link from landing page bottom strip
f70e2ff cleanup: dead code, og-image, host controls, admin end-room
f95a9a9 content: replace placeholder ticker facts with 20 verified scheme stats
522fed7 fix: restore omitted branding elements to projector lobby
addff8a feat: redesign projector lobby to match design system
```
Each commit message states the *why*; code comments at the two fix sites in
`src/app/api/game/route.ts` explain the reasoning inline. Working tree clean.
