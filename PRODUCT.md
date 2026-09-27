# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Players** (3 to 15 per game) use their own phones as private controllers. Settings are genuinely mixed with no single primary: exhibition stalls and public events, college fests and classrooms, office and corporate workshops. Design for the hardest case: a noisy hall, a projector read from across the room, walk-up strangers who have never seen the game and will not read instructions.

Players are English-first, but Hindi and other-language support is preferable (confirmed 2026-09-24). Card content is already bilingual (English + Hindi); the interface itself is English-only today. Players may write their explanations in English, Hindi, or Hinglish.

**Hosts** are two groups of roughly equal weight: Office staff and volunteers running the game at events, and anyone who finds the site and hosts at home with friends. The host drives the game from a laptop (the projector URL carries the host bar) or from a phone (a phone-native host view). A TV or projector shows the shared screen.

**Admin** is the creator, via `/admin` with Basic Auth: lists and ends active rooms.

## Product Purpose

Vikas 75 is a multiplayer party game about Indian government schemes. Each round a challenge card poses a real-sounding problem; every player picks a scheme card from their hand and defends the match in 25 words or fewer; an AI judge ranks the answers and rewards creativity and humour over rote correctness. It is educational by outcome and a game show by energy.

Success for the Office is all four of these, confirmed:

- laughter and energy in the room;
- players leave knowing scheme names;
- reach beyond the room (photos, shares, follows on the Office's channels);
- repeat play and word of mouth, so people host it again.

## Positioning

The judge rewards jugaad thinking. Scoring priority is innovative and funny, then unexpected but valid, then technically correct, then boring but accurate. Hinglish is fully accepted. The best answer is not always the right one, and the game says so out loud through its verdicts.

Phones are private controllers; the projector is the public stage. Entry is zero-friction: no accounts, no login. A four-letter room code or a QR scan gets a player in.

The 75 is the deck size: 75 scheme cards. It is not an independence-anniversary reference.

## Operating Context

- Three surfaces run at once: player phones (portrait, 375 px minimum width), the projector or TV (1920×1080 landscape, read from a distance), and the host controls (a bar over the projector URL, or the phone host view).
- Everyone shares venue Wi-Fi. Real-time sync is over Pusher with a polling fallback; rooms expire after 24 hours.
- Game loop: lobby → challenge reveal → submission (90 s default) → reveal → AI judging → winner → between rounds, repeating, or game over. The host advances each step manually except judging, which is automatic.
- Sessions run about 20 to 40 minutes at fests and workshops, shorter at walk-up stalls.
- Players may join in the lobby and between rounds; late joiners are dealt a hand and start at 0.
- Deployed on Vercel with Upstash Redis for state and Claude as the live judge.

## Capabilities and Constraints

- 30 challenge cards (c001 to c030: an English riddle plus a Hindi version) and 75 scheme cards (s001 to s075: English and Hindi name, description, bullet features). Card data lives in `context/cards_challenges.json` and `context/cards_schemes.json`. The engine is card-set agnostic; a mod is a folder with those two files.
- Scoring per round: first place 3, second 2, third 1, plus 1 bonus for a one-sentence explanation. Rounds won decides the champion; a genuine tie crowns joint champions.
- Explanation cap is 25 words. Timer default is 90 s. Rounds and timer are host-adjustable in the lobby.
- Judge: Claude (`claude-sonnet-4-6`) when the API key is configured, otherwise a random fallback with Hinglish-flavoured verdicts. The live call has an 8 s timeout and falls back silently.
- Minimum 2 players to start; no hard cap. Hands may overlap once the room passes about 10 players.
- Players may leave a room; hosts may kick a player, end the game early, and toggle music.
- Terminology: room, room code, host, player, hand, challenge card, scheme card, submission, verdict, round, champion.
- Undecided: the localisation approach for a Hindi or multi-language UI (preferable, not yet scoped). Card-set switching in the UI (designed in GAME_DESIGN.md, not built). The Team tab on Explore (deferred until real content exists).

## Brand Commitments

- Name: **Vikas 75**. Attribution line: **"An initiative of the Office of Shri Sujeet Kumar"**, which stays. Tagline: **"Play for Progress"** (changed 2026-09-24 from "The best answer isn't always right", updated across the codebase, metadata, manifest, and Open Graph image the same day). The old tagline must not appear anywhere.
- Nothing visual is binding. The card-deal intro animation, the pixel-art caricature avatars, the tricolour motif, and the current palette may each be replaced, but only for something that makes the game better. Replace, never dilute.
- The social links stay as they are: Shri Sujeet Kumar's website, Instagram, X, LinkedIn, Facebook, and YouTube.
- Voice: witty game-show host, Hinglish-friendly. The judge is a sharp commentator, never dry or formal.

## Evidence on Hand

- 105 card images in `public/cards/` (card-001 to card-105 as WebP), the printed physical deck. Card copy in `context/`.
- 20 verified government-scheme statistics used in the projector lobby ticker.
- 11 avatar tiles in `public/avatars/` (a1 to a11) plus a random pick option.
- Intro artwork in `public/intro/`, lobby music in `public/sounds/lobby.mp3`, PWA icons, and an Open Graph image.
- No testimonials, event photos, play counts, or press on hand. Do not fabricate any.

## Product Principles

1. **The room is the audience.** Every projector moment must read from the back of a noisy hall and land with someone who has never seen the game.
2. **One action at a time on the phone.** It is a controller, not a website.
3. **Reward the funny, teach on the way out.** Scheme names and facts ride along with the laughs; they never block them.
4. **Zero-friction entry.** A code or a QR gets anyone in within seconds, no accounts.
5. **Bilingual in content, English-first in interface, never English-only in spirit.** Hindi is a first-class part of the game, not a translation layer.

## Accessibility & Inclusion

- The OS reduced-motion setting is respected: animations collapse to their end state rather than leaving content hidden.
- Visible focus rings on all interactive elements; safe-area padding on phones; inputs sized to prevent iOS zoom.
- Design notes require 44 px minimum tap targets on the phone and distance legibility (large type, high contrast) on the projector.
- A Devanagari typeface is loaded for Hindi content wherever it appears.
