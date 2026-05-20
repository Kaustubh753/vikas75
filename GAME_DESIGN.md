# Vikas 75 — Game Design Document

## Overview

Vikas 75 is a multiplayer card game about Indian government schemes. Players match government schemes to real-world challenges, explain their reasoning, and an AI judge picks the most innovative and funny answer. It is designed for public events, exhibitions, college fests, and corporate workshops.

---

## Core Concept

- One screen (projector/TV) runs the shared game experience
- Each player uses their own phone as a private input device
- An AI judge (Claude) evaluates answers and rewards creativity over rote knowledge
- The game is educational but the energy is a game show, not a classroom

---

## Players and Roles

### Players (3 to 15 per game)
- Join via QR code or 4-letter room code
- Enter only their name, no account or login needed
- See their own hand of scheme cards on their phone
- Submit one scheme card + a written explanation per round
- Can write in English, Hindi, or Hinglish freely

### Host
- Creates the room from the main app
- Gets a separate host control panel on their device
- Can pause, extend timer, skip phase, or end game early
- Controls are a simple overlay on the projector URL or a separate /host route

### Admin (you, the creator)
- Accesses /admin with username + password
- Credentials stored in environment variables, never in the database
- Can upload new card set PDFs
- Can manage card sets, view game history, create special room codes
- Can configure game settings globally

---

## Game Flow

### 1. Lobby
- Projector shows: Vikas 75 branding, QR code, room code (large), list of joined players
- Player names appear in real time as people join
- Host starts the game when ready
- New players can also join between rounds, not mid-round

### 2. Challenge Reveal
- Projector goes dark, then the challenge card animates in dramatically
- Full screen: English text large and bold, Hindi text below it
- 5 second pause before the submission timer starts
- Same card appears on all player phones

### 3. Submission Phase
- Players browse their hand of scheme cards on their phone
- Tap a card to select it, tap again to expand and read full details
- Type an explanation (Hinglish welcome)
- Hit Submit
- Projector shows live progress: "4 of 6 players submitted"
- Player names tick off as they submit
- Default timer: 90 seconds. Host can extend or force-end early

### 4. The Reveal
- All submissions shown on projector one by one
- Each card shows: player name, scheme chosen, their explanation
- Crowd can read, react, debate before the verdict

### 5. AI Judge Deliberates
- Animated thinking screen on projector, 3 to 5 seconds
- Builds suspense

### 6. Winner Announced
- Big dramatic reveal on projector
- Winner name, scheme, reason why they won
- Scoring: +2 points to winner, +1 bonus if explanation was a single sentence
- Leaderboard updates live

### 7. Between Rounds
- Full leaderboard shown on projector
- New players can join here
- Host advances to next round manually or auto-advances after 15 seconds

---

## AI Judge Behaviour

This is critical to the game feel. The judge must:

- Accept and reward Hinglish answers fully
- Prioritise funny, creative, and innovative connections over technically correct but boring ones
- Scoring priority: innovative + funny > unexpected but valid > technically correct > boring but accurate
- Have a witty personality in its verdict text, not dry or formal
- Explain the reasoning in 2 to 3 sentences maximum
- Occasionally call out a particularly clever answer with extra flavour text

The judge prompt should explicitly instruct Claude to think like a sharp, witty commentator who appreciates jugaad thinking and rewards players who make the crowd laugh or think.

---

## Cards

### Challenge Cards (30 total)
- Each card has an English riddle/poem and a Hindi version
- The riddle hints at a real-world problem without naming the scheme
- Stored in: context/cards_challenges.json

### Scheme Cards (75 total)
- Each card has: English name, Hindi name, short description, bullet point features
- Players hold a hand of scheme cards dealt at the start
- Stored in: context/cards_schemes.json

### Card Sets and Mods
- The engine and the card data are completely separate
- A mod is just a new folder with its own cards_challenges.json and cards_schemes.json
- Future editions could include: Vikas 100, State Government edition, History edition, Corporate edition
- Admin portal manages which card set is active for a given room

---

## Visual Design

### Projector Screen
- Dark navy background (#1a3a6e) as the primary colour
- White text, bold English, lighter Hindi below
- Game show energy: large text, high contrast, dramatic transitions
- Vikas 75 branding always visible in corner

### Challenge Card (projector + phone)
- Navy blue background
- "Problem Statement" label at top in small caps
- English text large and bold, centred
- Hindi text below in a lighter colour
- Relevant icon at bottom (outline style, white)
- "Vikas 75" branding at bottom

### Scheme Card (phone)
- Cream/off-white background (#faf8f0)
- Dark navy scheme name in English, bold
- Hindi name below in navy
- Short description text centred
- Tricolour bar (saffron, white, green) as divider
- Bullet points below
- "Vikas 75" branding at bottom

### Player Phone UI
- Clean, mobile-first
- Cards are scrollable horizontally in the hand
- Selected card gets a navy border highlight
- Submission screen is minimal: just the text area and submit button
- Waiting screen shows a subtle animation

---

## Joining Mid-Game

- Allowed only between rounds, not mid-round
- New players get dealt cards from the remaining deck
- If the deck is exhausted they get a freshly shuffled hand of all scheme cards
- Their score starts at 0, leaderboard shows round they joined from

---

## Host Controls

- Pause/resume the timer
- Extend timer by 30 seconds
- Force-end submission phase early (all unsubmitted players skip)
- Skip to next phase
- End game and go to final leaderboard
- These controls appear on a /host route or as an overlay requiring a host PIN

---

## Admin Portal (/admin)

- Login with username + password (stored in environment variables)
- Only one admin account (the creator)
- Features:
  - Upload card set PDFs (Claude API parses them into JSON automatically)
  - View and manage all card sets
  - See active game rooms and their state
  - View game history and basic analytics
  - Create special room codes for specific events
  - Configure global game settings

---

## Tech Stack

- Framework: Next.js (hosted on Vercel, free tier)
- Real-time sync: Pusher (free tier, ap2 Mumbai cluster)
- Game state storage: Upstash Redis (free tier, ap-south-1 Mumbai)
- AI Judge: Anthropic Claude (claude-sonnet-4-20250514, called server-side only)
- PDF parsing: pdf-parse npm package + Claude API for extraction
- Styling: Tailwind CSS

---

## Environment Variables Required

```
ANTHROPIC_API_KEY=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=ap2
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=ap2
ADMIN_USERNAME=
ADMIN_PASSWORD=
NEXTAUTH_SECRET=
```

---

## Project Folder Structure

```
vikas75/
├── GAME_DESIGN.md
├── context/
│   ├── cards_schemes.json
│   ├── cards_challenges.json
│   └── card_design_notes.md
├── src/
│   ├── app/
│   │   ├── page.tsx              (home: enter name + room code)
│   │   ├── room/[code]/page.tsx  (player view)
│   │   ├── projector/[code]/page.tsx (projector view)
│   │   ├── host/[code]/page.tsx  (host controls)
│   │   └── admin/
│   │       ├── page.tsx          (admin login)
│   │       └── dashboard/page.tsx (admin dashboard)
│   ├── components/
│   │   ├── cards/
│   │   ├── projector/
│   │   ├── player/
│   │   └── admin/
│   ├── lib/
│   │   ├── pusher.ts
│   │   ├── redis.ts
│   │   ├── game-engine.ts
│   │   └── ai-judge.ts
│   └── app/api/
│       ├── game/route.ts
│       ├── judge/route.ts
│       └── admin/route.ts
├── .env.local
└── package.json
```

---

## Phased Build Plan

### Phase 1 (Tonight): Working Prototype
- Room creation and QR code
- Join by code or QR
- Projector view with all game phases
- Phone player view
- Live submission tracking via Pusher
- AI Judge verdict
- Scores and leaderboard
- Basic host controls
- Using built-in card data (JSON files)

### Phase 2: Admin Portal
- /admin login
- PDF upload and parsing
- Card set management
- Game history

### Phase 3: Polish
- Animations and transitions
- Sound effects
- Timer visuals
- Mobile optimisation
- All game modes (Quick Play, Debate, Combo)

### Phase 4: Mod System
- Multiple card set support
- Custom rules per card set
- Room can select which edition to play
