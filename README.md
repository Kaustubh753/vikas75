# Vikas 75

A multiplayer party game about Indian government schemes.

Everyone plays on their own phone. A laptop runs the game, a TV or projector shows the public
screen, and Claude judges each round. Players are dealt scheme cards, a challenge card names a
problem — *"Farmers cannot get loans"* — and each player plays the scheme they think solves it
best, with one line arguing their case. The AI judge reads every answer anonymously and crowns
a winner. Most rounds won takes the game.

75 scheme cards · 30 challenge cards · 2–20 players · about 15 minutes.

---

## Play

Three screens, one room code:

| Screen | Who opens it | URL |
|---|---|---|
| **Join / create** | everyone | `/` |
| **Projector** | the TV or big screen | `/projector/[CODE]` |
| **Host controls** | whoever runs the game | `/host/[CODE]?h=[HOST_ID]` |

The host creates a room and gets both links. Players scan the QR code on the projector or type
the four-letter room code. The host advances each phase; judging is the one automatic step.

There's also `/explore` — the full deck of 75 schemes with a one-page official guide for each,
readable without starting a game.

---

## Run it locally

Requires **Node ≥ 22.18**.

```bash
npm install
cp .env.example .env.local   # fill in the Pusher keys — see below
npm run dev
```

Then open three browser windows: `http://localhost:3000` to create a room, and the projector
and host URLs it hands you.

**Minimum config is the four `PUSHER_*` variables plus the two `NEXT_PUBLIC_PUSHER_*` ones.**
Everything else degrades gracefully:

- No `UPSTASH_REDIS_*` → rooms live in a module-level `Map`. Fine for local dev; **not** for
  production, where serverless instances don't share it.
- No `ANTHROPIC_API_KEY` → a fallback judge picks a random winner with a Hinglish verdict.
- No **client** `NEXT_PUBLIC_PUSHER_*` → the server still boots, but every browser silently
  falls back to polling. This looks like a laggy game rather than a config error, so check it
  first if updates feel slow. The four **server-side** `PUSHER_*` variables are different: the
  app refuses to boot without them and tells you which are missing.

The full table is in [CLAUDE.md](./CLAUDE.md#environment-variables), and `.env.example`
documents each variable inline.

---

## Checks

```bash
npm run lint       # eslint
npx tsc --noEmit   # type-check
npm test           # plain-node unit tests (judge logic + player ranking)
npm run build      # production build, also type-checks
```

There is no test framework. `npm test` runs two plain-node scripts over the two pure modules
where a silent bug would otherwise reach a live game: the AI judge's scoring pipeline and the
shared player ranking. Each carries an oracle — that submission order cannot decide a round,
and that the leaderboard can never name a different winner than the final podium. Everything
else is covered by the type-checker, the linter and play-testing. CI runs all four commands on
every push.

---

## Built with

Next.js 16 (App Router) · React 19 · Tailwind v4 · Pusher · Upstash Redis · Claude (Sonnet 5)

Deployed on Vercel. An Android wrapper (Trusted Web Activity) lives in [`apk/`](./apk).

---

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** — the developer guide. Architecture, the cross-cutting concerns
  to read before touching the API (auth, locking, rate limits, the revision counter), a file
  map, environment variables, and the history of bugs fixed and why.
- **[AGENTS.md](./AGENTS.md)** — a note for AI coding agents about the Next.js version.
- **[apk/README.md](./apk/README.md)** — building and signing the Android app.

---

An initiative of the Office of Sujeet Kumar.
