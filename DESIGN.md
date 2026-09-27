---
name: Vikas 75
description: A sarkari game show on a warm black stage, where cream paper cards are the only things that catch the light.
colors:
  studio-black: "#08070f"
  spotlight-saffron: "#FF9933"
  saffron-hot: "#e8872a"
  saffron-lip: "#cc7a00"
  cue-card-cream: "#faf8f0"
  trophy-gold: "#FFD700"
  flag-green: "#138808"
  problem-card-navy: "#1a3a6e"
  buzzer-red: "#ef4444"
  runner-up-silver: "#C0C0C0"
  third-place-bronze: "#CD7F32"
  ink: "#1a1208"
  tile-ink: "#15110a"
  house-light-70: "rgba(250,248,240,0.7)"
  house-light-45: "rgba(250,248,240,0.45)"
  hairline: "rgba(250,248,240,0.14)"
  glass-fill: "rgba(250,248,240,0.04)"
  tint-challenge: "#110b26"
  tint-reveal: "#0a1608"
  tint-winner: "#171002"
  tint-game-over: "#110902"
  stage-white: "#ffffff"
  shadow-ink: "rgba(0,0,0,0.45)"
  intro-paper: "#f6efd8"
  intro-paper-hi: "#fdf8e8"
  intro-ink: "#173458"
  intro-saffron: "#ee7d23"
  intro-green: "#1fa24a"
typography:
  display:
    fontFamily: "Bebas Neue, Impact, sans-serif"
    fontSize: "clamp(48px, 6.5vw, 96px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Bebas Neue, Impact, sans-serif"
    fontSize: "clamp(28px, 3.5vw, 60px)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.1em"
  title:
    fontFamily: "Yatra One, Bebas Neue, sans-serif"
    fontSize: "clamp(22px, 2.4vw, 34px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(13px, 1vw, 16px)"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(9px, 0.76vw, 11px)"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.16em"
  hindi:
    fontFamily: "Noto Sans Devanagari, sans-serif"
    fontSize: "clamp(12px, 1vw, 16px)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
rounded:
  sharp: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  xxl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.spotlight-saffron}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    height: "56px"
    width: "100%"
  button-entry:
    backgroundColor: "{colors.spotlight-saffron}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sharp}"
    height: "52px"
    padding: "0 24px"
  button-entry-hover:
    backgroundColor: "{colors.saffron-hot}"
    textColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.spotlight-saffron}"
    typography: "{typography.label}"
    rounded: "{rounded.sharp}"
    height: "52px"
    padding: "0 24px"
  button-advance:
    backgroundColor: "{colors.spotlight-saffron}"
    textColor: "{colors.studio-black}"
    typography: "{typography.headline}"
    rounded: "22px"
    height: "44px"
    padding: "0 28px"
  button-icon:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "rgba(255,255,255,0.6)"
    rounded: "{rounded.sm}"
    size: "38px"
  input:
    backgroundColor: "{colors.glass-fill}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.sharp}"
    height: "50px"
    padding: "0 16px"
  code-slot:
    backgroundColor: "{colors.glass-fill}"
    textColor: "#ffffff"
    rounded: "{rounded.sharp}"
    width: "clamp(48px, 14vw, 60px)"
    height: "clamp(56px, 16vw, 68px)"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.spotlight-saffron}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  chip-ready:
    backgroundColor: "rgba(19,136,8,0.12)"
    textColor: "{colors.flag-green}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 9px"
  panel-glass:
    backgroundColor: "rgba(250,248,240,0.025)"
    rounded: "{rounded.xl}"
    padding: "clamp(14px, 1.6vh, 24px) clamp(20px, 2.4vw, 32px)"
  code-tile:
    backgroundColor: "{colors.cue-card-cream}"
    textColor: "{colors.tile-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    width: "76px"
    height: "100px"
  card-scheme:
    backgroundColor: "{colors.cue-card-cream}"
    rounded: "{rounded.md}"
    width: "160px"
    height: "214px"
  host-bar:
    backgroundColor: "rgba(8,7,15,0.92)"
    height: "72px"
    padding: "0 20px"
---

# Design System: Vikas 75

## Overview

**Creative North Star: "The Sarkari Game Show"**

Vikas 75 is staged, not laid out. Every screen is a broadcast set: a warm near-black studio floor, one saffron spotlight falling from the top of the frame, a fine film grain over everything, and physical objects placed on it. The physical objects are the printed deck (cream scheme cards, navy problem cards), the cream room-code tiles dealt at a slight tilt, the QR mat, and the player avatars. They are the only things that catch the light. Everything else, the panels, chips, bars and labels, is set dressing: flat, glassy, hairline-bordered, meant to recede so the room looks at the cards and the people.

The voice is warm, theatrical, witty, playful and punchy. Type does the shouting: Bebas Neue capitals at poster scale for anything the back row must read, Yatra One for the wordmark and the dealt tiles, Inter in small tracked capitals for the labels a stage manager would print on tape. The energy reference is the Family Feud and Jeopardy mobile apps and UNO: bold artwork, confident animation, a scoreboard rhythm. Where that calls for artwork code cannot draw (mascots, illustrated backdrops, card art), the product owner produces it for handoff rather than the system faking it in CSS.

The tricolour is set dressing, never a fill: a five-pixel strip at the very top of every page, one-pixel bars on the card back, the podium colours. Confirmed anti-references: a government portal, a generic dark-mode SaaS app, a kids' quiz app, a political campaign page.

**Key Characteristics:**
- Warm near-black stage with a saffron spotlight and film grain on every surface
- Real objects (cards, tiles, QR, avatars) cast heavy shadows; UI panels are flat glass
- Bebas Neue capitals at poster scale on the projector; Inter tracked labels for chrome
- Saffron is the single action colour; gold is reserved for winners; green for "ready"
- Tilted tiles and dealt cards make the interface feel handled, not rendered
- Chunky, pressable phone controls with a visible push

## Colors

A single warm accent on a warm black, with paper cream for the only light surfaces and three ceremonial colours held in reserve.

### Primary
- **Spotlight Saffron** (#FF9933): the one action colour. Primary buttons, the selected card's border and check badge, the timer bar, the host badge and Lobby pill, the "Did you know" label, the radial spotlight glow at 16% falling from top centre. Also the focus ring on every interactive element.
- **Saffron Hot** (#e8872a): hover fill for saffron buttons on the landing, host bar and chat send.
- **Saffron Lip** (#cc7a00): the 4px solid shadow under the phone's primary buttons that compresses to 0 on press.

### Secondary
- **Trophy Gold** (#FFD700): winners only. The round winner's name at 80 to 96px, the gold ring and halo around the winning avatar, the leader row on the leaderboard, the first-place podium, "+bonus". Never used for emphasis anywhere else.
- **Flag Green** (#138808): "ready" and "submitted". The ready chip in the lobby seat, the submitted tick and tile border on the projector, the room-open pulse dot, the third stripe of the tricolour.

### Tertiary
- **Problem-Card Navy** (#1a3a6e): the navy of the printed challenge cards, carried into the challenge banner on the projector, the avatar tile background on the join page, the verdict panel behind the winning explanation, and the lobby seat gradient at 55% to 22%.
- **Buzzer Red** (#ef4444): the last ten seconds of every timer (fill plus a red glow), "TIME'S UP", the kick button, End Game.
- **Runner-up Silver** (#C0C0C0) and **Third-place Bronze** (#CD7F32): the second and third podium steps and their rings. Podium only.

### Neutral
- **Studio Black** (#08070f): the stage. Body background, every phase screen, the card back, the PWA theme colour. Phases tint it, they never replace it: Challenge tint (#110b26) during the reveal, Reveal tint (#0a1608), Winner tint (#171002), Game-over tint (#110902), cross-faded over 0.8s.
- **Cue-Card Cream** (#faf8f0): paper. The scheme card face, the room-code tiles, the QR mat, the blur placeholder behind loading scheme cards. As text it is used through alpha: House Light 70 (rgba(250,248,240,0.7)) for secondary copy and eyebrows, House Light 45 (rgba(250,248,240,0.45)) for tertiary labels, 0.3 to 0.4 for muted footers, Hairline (rgba(250,248,240,0.14)) for every panel border and divider, Glass Fill (rgba(250,248,240,0.04)) for input and panel backgrounds. Pure white (#fff) is used for names, headlines and body on the phone.
- **Ink** (#1a1208) and **Tile Ink** (#15110a): the only dark text in the system, on saffron entry buttons and on the cream code tiles.
- **Stage White** (#ffffff): names, headlines and body on the phone, the winner's name panel, the middle stripe of the tricolour, and the light source in every inset highlight.
- **Shadow Ink** (rgba(0,0,0,0.45)): the black every shadow is cast in, used through alpha from 6% (a tile's hairline edge) to 70% (the hero card's throw). Never a fill.

### The intro's own palette
The brand intro is a curtain, not a screen, and keeps the palette it was drawn in: **Intro Paper** (#f6efd8) with **Intro Paper Hi** (#fdf8e8) at its warm centre, **Intro Ink** (#173458) for the pixel wordmark, its shadows and vignette at 10 to 40% alpha, and its own **Intro Saffron** (#ee7d23) and **Intro Green** (#1fa24a) for the tricolour rule, the arrow trail and the confetti. These five values appear nowhere else. When the curtain lifts, the stage palette above takes over.

### Named Rules
**The Spotlight Rule.** Saffron is the only warm accent and there is one saffron-filled control per view. If two things are saffron-filled, one of them is wrong.

**The Cue-Card Rule.** Cream appears only on things that are physically paper: card faces, code tiles, the QR mat. It is never a panel background and never a page background.

**The Trophy Rule.** Gold means someone won. It never decorates, highlights or brands.

## Typography

**Display Font:** Bebas Neue (with Impact, sans-serif)
**Wordmark Font:** Yatra One (with Bebas Neue)
**Body Font:** Inter (with system-ui, sans-serif)
**Hindi Font:** Noto Sans Devanagari, weights 400 and 500

**Character:** A compère's voice. Bebas Neue shouts in capitals at poster scale and is legible from the back of a hall; Inter whispers the stage directions in small tracked capitals; Yatra One gives the wordmark and the dealt tiles a hand-lettered, Devanagari-adjacent warmth. Hindi copy is never squeezed into the Latin faces.

### Hierarchy
- **Display** (Bebas Neue 400, clamp(48px, 6.5vw, 96px), line-height 1, tracking 0.04em): the round winner's name, "KHEL KHATAM!" at 96px, "The winner is…" at 96px. The full-screen interstitials go larger still: "GET READY" and "AND THE WINNER IS…" at min(15vw, 120px); the phase overlays "ROUND 1", "ALL IN", "TIME'S UP" at min(20vw, 160px) with a black text shadow.
- **Headline** (Bebas Neue 400, clamp(28px, 3.5vw, 60px), line-height 1.1, tracking 0.1em): projector section titles ("Let's see what everyone played…", "AI Judge Deliberates"), the submitted counter, the challenge text on the projector at clamp(20px, 2.2vw, 36px). On the phone the same face drops to 22 to 32px for "SUBMITTED!", "Game Over!", the room code at 48px with 0.2em tracking, and the primary button label at 22px.
- **Title** (Yatra One 400, clamp(22px, 2.4vw, 34px), line-height 1, tracking -0.01em): the "Vikas 75" wordmark (up to 78px on the landing), the four room-code tiles at 70% of tile width, the "+N more" numeral, the How-to-play step numerals.
- **Body** (Inter 400, clamp(13px, 1vw, 16px), line-height 1.5): explanations, verdict reasoning, ticker facts, chat. Player names are Inter 500 to 600. Quoted explanations are italic at 70 to 85% white. Keep verdict copy under about 40ch on the projector.
- **Label** (Inter 600, clamp(9px, 0.76vw, 11px), tracking 0.16em, uppercase): every eyebrow and status: "scan to join", "enter the room code", "Room open · 3 joined", "Problem Statement", "Your Hand — tap to select", the HOST badge. Tracking ranges from 0.08em on longer lines to 0.22em on two-word labels.
- **Hindi** (Noto Sans Devanagari 400, clamp(12px, 1vw, 16px), line-height 1.6): the Hindi line of a challenge on the phone, in a lighter blue-white than the English above it.

### Named Rules
**The Back-Row Rule.** Anything a player must read from across the room is Bebas Neue capitals at 36px or larger on the projector. Inter is for what the host reads up close.

**The Tape-Label Rule.** Chrome labels are Inter 600, uppercase, 9 to 11px, tracked at least 0.08em, and never pure white: House Light 70 or 45.

## Layout

Three surfaces, three grammars, one stage.

**Projector (16:9, 1920×1080 first).** Full-bleed flex columns with clamp()-driven type and padding: clamp(20px, 2.6vh, 40px) vertical, clamp(40px, 5vw, 72px) horizontal in the lobby. The lobby stacks header → centred body (join card, seats, banter) → footer → ticker. Phase screens centre one hero object: the challenge card at 65vh, the reveal fan, the winner. Grids adapt to head-count: submission tiles are 220px minimum for four players, 180px for eight, 150px for twelve, 120px beyond; leaderboard rows compress padding and type at six and ten players; lobby seats scale between 90px and 166px to fit 78% of the viewport width. When a host is present the bottom 72px (60px under 640px wide) is reserved for the host bar. A non-host projector in portrait shows a rotate prompt.

**Phone (portrait, 375px minimum).** A single column with 16px gutters, content capped at 400px, stacks at 20 to 24px gaps. Header: logo lockup on the left, music toggle, round counter and Leave on the right. The timer bar is sticky at the top of the submit screen at 24px tall. The card tray scrolls horizontally with 160×214 cards at 12px gaps. Chat and emote are 48px floating buttons pinned bottom-left and bottom-right at 80px from the bottom, inside the safe-area inset. The join page is a 400px column on the stage backdrop: a header row with "← Home" at the left (never beside the primary button, where a slipped thumb would lose the form) and the wordmark at the right; "JOIN THE GAME" in Bebas with its Hindi line "खेल में शामिल हों" beneath; the name with "Your name and avatar show on the big screen" (or a duplicate-name hint when the room already has that name); four centred code slots with the status and alert lines; the 3×4 avatar grid at 8px gaps with taken tiles dimmed and captioned; and a fixed bottom Join bar (56px, always saffron, reason on the label, focusable and `aria-disabled` rather than disabled so a tap points at the missing field) over a black gradient with "The host starts the game on the big screen." under it, and 150px of bottom padding so the last row scrolls clear. The body's `overflow-x: hidden` guard defeats `position: sticky`, so bottom bars are fixed. The phone lobby opens with a first-use beat: the player's avatar, "YOU'RE IN, ASHA DEVI" in Bebas (Devanagari fallback in the stack) and "Watch the big screen. The host starts the game there." above the waiting dots and the roster, so the join is confirmed before anything else is asked. Below the roster an invite card ("BRING MORE PLAYERS") shows the join link in full with a filled saffron "SHARE THE LINK" (the share sheet, or a copy with a "Link copied" toast) and an outlined WhatsApp button: the one filled control on the waiting screen. In every other phase an identity strip sits under the header: the player's avatar at 28px in a 6px square, their name in Inter 600 at 13px and a saffron "YOU" tape label ("· NEXT ROUND" appended while they sit a round out). A player who joins once a round is under way sees their avatar at 96px, "YOU'RE IN, SURESH" and "Round 1 is under way on the big screen. You play from round 2." over the waiting dots, never the challenge prompt or the card tray; the projector's submission tracker counts only eligible players and gives late joiners a saffron-bordered tile labelled "NEXT ROUND".

**Landing, phone.** Lockup, three rule lines, then the CTA pair pushed into the lower half by `margin-top: auto`: Join filled (players are on phones), Host ghost, a 44px "How to play →". Footer targets are 44px squares.

**Landing (desktop above 768px).** A three-column grid, minmax(220px, 21vw) / 1fr / minmax(240px, 24vw), logo, the one-glance premise ("PICK A SARKARI SCHEME · DEFEND IT IN 25 WORDS · FUNNIEST ANSWER WINS" in Bebas at clamp(18px, 1.5vw, 26px), the same words the lobby uses) and 52px CTAs left, the interactive card fan centre (scaled from a 1440×900 baseline; the deal starts only after the intro leaves), the five How-to-play steps as a static list in a glass panel right (titles clamp(14px, 1.05vw, 16px), bodies clamp(12px, 0.9vw, 13px), labels never under 11px) with a "Full rules →" link, a bottom strip spanning all three with 44px targets. No carousel, no auto-advance. The page is `inert` while the intro curtain is up, and focus lands on Host a Game once it lifts. Below 768px it becomes the phone stack above. Under the premise sits its Hindi line in Noto Sans Devanagari at clamp(12px, 0.95vw, 14px) in House Light 55. The fan is scaled to 0.84 of the 1440×900 baseline and teaches: under the stage a cue-card caption of fixed height (96px, so nothing below it moves; the printed line clamps to two lines) reads the picked card's own words from the deck, an eyebrow ("ONE OF 75 SCHEME CARDS" or "THE CHALLENGE CARD"), the name in Bebas, its Hindi name, and its one printed line, rising in on the expo curve and announced through `aria-live="polite"`; before any pick it says "SIX OF THE 75 · PICK ONE UP TO READ IT". The hand is one tab stop (the last picked or focused card, else the challenge card); the arrow keys walk the cards, Home and End jump, Enter or Space picks. The music toggle in the bottom strip draws its speaker as a stroke icon in currentColor, like the host bar.

**The intro** composes to the live viewport rather than a fixed 1920×1080 stage: landscape keeps the original proportions (wordmark at 61% of the width, the fan spanning ±37%), portrait re-proportions around a 90%-wide wordmark with a tighter fan. It plays in full once per device on the landing and the QR join path alike, then a 1.2s logo sting on landing returns and nothing on join returns. Its Skip is 44px with "Tap anywhere to skip" printed, PLAY NOW is a real button that lands focus on Host a Game, and the attribution band is live Press Start 2P text with the full wording.

**Breakpoints observed:** 640px (host bar narrows), 768px (landing stacks, host gets the phone-native view). Spacing runs 4 / 8 / 12 / 16 / 24 / 32 / 40px; tile and seat rotations of -3°, 1.5°, -1°, 2.5° make dealt objects feel placed by hand.

## Elevation & Depth

A hybrid with a strict rule: depth belongs to objects, not to interface. The stage is flat. Real things sit on it and throw heavy, warm-black shadows; the interface is glass drawn with a hairline. Light comes from one place, the saffron spotlight at top centre, so glows are rare and mean something.

### Shadow Vocabulary
- **Dealt card** (`box-shadow: 0 22px 30px rgba(0,0,0,0.55), 0 7px 12px rgba(0,0,0,0.45)`): the landing fan at rest. Hover adds a gold glow (`0 0 18px rgba(255,215,0,0.4)`), selection a stronger one; the challenge card glows navy-blue instead.
- **Code tile** (`box-shadow: 0 16px 30px rgba(0,0,0,0.45), 0 4px 8px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.6)`): cream tiles with a paper edge highlight.
- **Hero card** (`box-shadow: 0 40px 100px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,153,51,0.4)`): the challenge card at 65vh on the projector.
- **Hand card** (`box-shadow: 0 4px 20px rgba(0,0,0,0.35)`, selected `0 0 0 2px rgba(255,153,51,0.4), 0 8px 32px rgba(0,0,0,0.4)`): the phone tray.
- **Seat** (`box-shadow: 0 18px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`): filled lobby seats, the one panel allowed a shadow because it holds a person.
- **Row** (`box-shadow: 0 4px 24px rgba(0,0,0,0.3)`): leaderboard rows and the phone's challenge banner. The lightest shadow in the system.
- **Trophy halo** (`box-shadow: 0 0 80px rgba(255,215,0,0.38)`, plus `filter: drop-shadow(0 0 40px rgba(255,215,0,0.25))`): the winning avatar. Gold light, winners only.
- **Push lip** (`box-shadow: 0 4px 0 #cc7a00`, pressed `0 0 0 #cc7a00` with a 4px translate): the phone primary button.
- **Chrome** (`backdrop-filter: blur(24px)` on rgba(8,7,15,0.92), the stage at 92%; popovers rgba(8,7,15,0.95) with a 20% white border): the host bar, settings and players panels, chat and emote popovers. The bar was once a cool navy rgba(7,16,31,0.92) that seamed against the warm stage; it now takes the stage's own black.
- **Atmosphere**: the spotlight `radial-gradient(ellipse at center, rgba(255,153,51,0.16) 0%, rgba(255,153,51,0.06) 28%, rgba(255,153,51,0) 60%)` positioned at top -25%, 83vw wide; film grain from an SVG feTurbulence tile at 12% opacity with mix-blend overlay (landing, lobby) or 3.5% via `.grain-overlay`.

### Named Rules
**The Real-Object Rule.** Only things that exist in the physical game (cards, tiles, the QR mat, avatars in a seat) cast shadows. Panels, chips, bars and inputs are flat glass with a Hairline border and, at most, a one-pixel inset highlight.

**The One-Lamp Rule.** There is one light source, the saffron spotlight at top centre. Coloured glows are limited to gold on winners, saffron on the selected card, red on an expiring timer.

## Shapes

Two corner families coexist, and the split is deliberate: the entry chrome (landing buttons, join inputs, code slots) is sharp at 6px, like printed tickets; the game objects and game UI are soft at 12 to 18px, like handled cards. Cards use 12px on the phone (rounded-xl), 16px for the submitted and challenge cards (rounded-2xl), 24px for the 65vh hero card. Panels use 18px (the join card, seats). Icon buttons 8px, avatar tiles 10px, the host advance pill 22px, chips and status pills fully round (999px). Avatars are square images cropped by their container: 6px in a list row, 12px in a seat, 24px with a 4px gold ring on the winner.

Borders are one pixel and Hairline unless they mean state: 2px saffron on a selected card or a filled code slot, 1.5px saffron on the ghost button, 3px saffron on the card back, 1.5px dashed cream at 18% on an open seat. Code tiles carry a saffron pip at top-left like a playing-card index, and everything dealt is rotated a degree or three.

## Components

### Buttons
- **Primary, phone** (`button-primary`): full width, 56px tall, 12px radius, Spotlight Saffron fill, Ink Bebas Neue at 22px with widest tracking (8.8:1, where white on saffron was 2:1), and the Saffron Lip: a 4px solid shadow below. On press the button translates down 4px and the lip goes to 0. Disabled stays saffron at 82% with no lip and puts the reason on the label: "Tap a card to play it", "Write your justification first", "Enter your name to join". Enabled, the label says what happens next: "Play Jan Dhan →", "Throw Your Card ↑", "Join the game".
- **Entry** (`button-entry`): the landing and join CTAs. 52px tall (clamp(38px, 4.2vh, 52px) on the landing), 6px radius, saffron fill with Ink text in Inter 600 at 13px, uppercase, tracked 0.14 to 0.18em. Hover: Saffron Hot fill, a 1px lift, `0 6px 24px rgba(255,153,51,0.32)` glow. Disabled: 45% opacity.
- **Ghost** (`button-ghost`): same shape as Entry with a transparent fill, 1.5px saffron border and saffron text; hover tints the fill to 8% saffron. Used for the secondary action beside a primary ("Join a Game", "← Change card", "Invite Friends" at 12px radius on the phone).
- **Advance pill** (`button-advance`): the host's one big button. 44px tall, 22px radius, saffron fill, Studio Black text in Bebas Neue 22px tracked 0.08em, 200px minimum width. Hover Saffron Hot; disabled 40%; while the judge runs it is replaced by a pulsing dot and "AI Judging…".
- **Icon** (`button-icon`): 38px square, 8px radius, 6% white fill, 10% white hairline, 60% white glyph. Hover or active: 18% saffron fill, 50% saffron border, saffron glyph. Destructive variant tints to Buzzer Red on hover.
- **Focus**: every control gets a 2px saffron outline with 2px offset via `:focus-visible`.

### Chips
- **Status chip** (`chip`): pill, transparent, 1px saffron at 35%, saffron Inter 600 label at 10px tracked 0.22em ("Lobby", "HOST").
- **Ready chip** (`chip-ready`): pill, Flag Green text on 12% green fill with a 30% green border, uppercase label tracked 0.16em.
- **Banter chip**: pill, Glass Fill, Hairline border, saffron bold name plus House Light 70 "just joined"; animates in from 8px below over 0.4s.

### Cards / Containers
- **Scheme card** (`card-scheme`): the printed card image at 3:4 (413:554), 160×214 on the phone, clamp(160px, 18vw, 260px) wide on the projector. Cream blur placeholder while loading. Idle: 1px 10% white border, Hand card shadow, a tilt of -2° to +2° derived from index. Selected: 2px saffron border, saffron ring, a 24px saffron check badge top-right, tilt zeroed, scale 1.03 on hover. The projector reveal flips each card from the card back over 0.7s.
- **Card back**: Studio Black, 3px saffron border, 16px radius, a 6% saffron crosshatch, and "VIKAS 75" in Bebas Neue at 50% saffron between two 44px tricolour bars.
- **Glass panel** (`panel-glass`): 2.5% cream fill, Hairline border, 1px inset white highlight at 4%, 18px radius. The lobby join card, the phone's challenge banner (6% white fill with the Row shadow), the submitted-answer box.
- **Code tile** (`code-tile`): Cue-Card Cream, Tile Ink, Yatra One at 70% of tile width, radius clamp(8px, 0.7vw, 14px), 1px 12% black border, the Code tile shadow, a saffron pip top-left, rotated by the tile rotation set.
- **Seat**: 18px radius, Problem-Card Navy gradient 55% to 22%, 22% saffron border, the Seat shadow, avatar as a rounded square (14% radius) at 44% of the seat's height with a 40% saffron ring, name in Inter 600 on up to two lines (18px floor, one size down past 18 characters; the smallest seats trade to a 38% avatar and a 16px name to keep the second line). No ready chip: a seat is a seat. Open seat: dashed 18% cream border, a dashed "+" tile, "open seat" label.
- **Leaderboard row**: 12px radius, 6% white fill, 12% white border, Row shadow; Bebas rank and score, Inter 500 name, avatar at 26 to 40px. Leader: 40% gold border, 5% gold fill, gold rank and score.
- **Podium**: three steps with rounded-top 12px blocks in 20% gold / silver / bronze fills and 2px matching borders at 40 to 50%, ring-4 avatars, a crown emoji over first.

### Inputs / Fields
- **Text input** (`input`): 50px tall, Glass Fill, Hairline border, 6px radius, Inter 16px white, placeholder at 30% white. Focus: saffron border. Inputs are never smaller than 16px so iOS does not zoom.
- **Code slot** (`code-slot`): one character per box, clamp(52px, 15vw, 64px) by clamp(58px, 16vw, 70px), centred in a 12px-gap row, Glass Fill with a 1.5px Hairline, 6px radius, Inter 600 at clamp(24px, 6vw, 28px) uppercase with a saffron caret. The focused slot is unmistakable: saffron border, 8% saffron fill, a 3px saffron bar along its bottom edge, and the global focus ring. Filled slots keep the saffron border; only a code that matches no room paints all four Buzzer Red. Each slot selects its content on focus so typing overwrites, a burst of letters spills into the next slots, clearing a middle letter never shifts the rest, and a paste extracts the code from a share link, a "code: XSZQ" message, or a partial "code is NEC". Excludes I and O. One shared component, `ui/CodeInput.tsx`.
- **Room status and alert**: two persistent live regions under the slots, Inter 13px, centred. `role="status"` in the Flag Green ramp (#85c47d) says what the room answers: "Checking the code…", "Room XSZQ · 3 players waiting". `role="alert"` in #f87171 says what went wrong: "No room with this code. Check the big screen.", a friendly transport error. Transport errors never turn the slots red.
- **Avatar grid**: a `radiogroup` with one roving tab stop (the chosen tile, or the dice when nothing is chosen); arrow keys walk the 3-column grid, Space or Enter picks; every tile, taken ones included, shows the global focus ring. The dice is Problem-Card Navy with a saffron hairline, never a second saffron fill. A tap on a taken tile answers in the caption: "That one's Asha Devi's. Pick another."
- **Textarea** (justification): 12px radius, 2px 20% white border, 5% white fill, Inter 14px, 4 rows; focus saffron border plus a 40% saffron ring. A word counter turns orange at 10 words left and red at 5.
- **Range slider** (host settings): native, `accent-color` saffron, with a Bebas value readout in saffron.

### Navigation
- **Host bar** (`host-bar`): fixed bottom, 72px (60px narrow), the stage's own black at 92% with 24px blur, 1px saffron top border at 22%. Left: HOST chip, phase label, then "4 players · 5 rounds · 90s" in the lobby or "Round 2/5 · 4 players" in play. Centre: the Advance pill, disabled with its reason as the label ("Need 2 players to start") until the room can start; failures surface as toasts, never as 10px text at the far edge. Right: labelled 44px controls, a stroke icon in currentColor (never an emoji) over an 11px tape label: Invite, Players, Settings (lobby only), Sound (one toggle, `aria-pressed`, the icon shows the state and the tooltip names the action), Hide, then a hairline and End set apart. Panels are right-hand drawers above the bar, min(380px, 23vw) wide with a 12px radius, rising 12px over 0.22s on the expo curve, narrow enough never to touch the join card in the centre of the lobby; Escape closes the End dialog, then any open drawer. The Invite drawer holds the room's join link (the same /join?code= deep link the QR encodes) in a selectable hairline box, with Copy link, WhatsApp (a wa.me message carrying the code and the link) and, where the browser has a share sheet, Share…, all outlined saffron at 44px; a copy confirms with a "Link copied" toast. The settings drawer stacks its two sliders and echoes "Saved ✓" in green for 1.6s after a change; the players drawer lists avatar and name (the score only once play has started) with Remove beside the name, which drops a line to "Remove Bharat?" with Keep first and focused and an outlined "Yes, remove" second, both 36px. Failures are toasts bottom-right just above the bar, each with a next step ("Could not advance. Try again.", "This tab is not the host. Use the host link to run the game."). The disabled Advance pill stays saffron at 82% with the reason as its label, like the phone primaries. The one sound control on a host's screen: the floating mute belongs to a pure projector display only. Collapsed, a "HOST ▲" pill floats bottom-right; while the bar is open that pill is out of the tab order.
- **Phone header**: the small logo lockup (saffron left rule, attribution eyebrow, wordmark, tagline) with a 40px round music toggle, a Bebas round counter, and a 40px "← Leave" glass button.
- **Landing bottom strip**: hairline top border; social icons at 60% cream left, "Curious what's in the deck? →" centre, music toggle and © line right.

### Lobby stage (signature)
The waiting screen is the game's shop window and is composed for the back row. Under the header, one poster line in Bebas Neue at clamp(22px, 2.1vw, 40px), "PICK A SARKARI SCHEME · DEFEND IT IN 25 WORDS · FUNNIEST ANSWER WINS", its Hindi line beneath in Noto Sans Devanagari, and a saffron eyebrow "NO APP · NO SIGN-UP · 30 SECONDS TO JOIN". The header's right corner says only "Room open" with its green dot; the count lives in the status line. The join card holds the QR as the hero at 30% of the screen height (24% on screens under 800px tall, 23% with two rows of seats, 20% with both) on its cream mat at error-correction H with a 15% V·75 badge, "SCAN TO JOIN" and "TYPE THE CODE" in Bebas at clamp(20px, 1.9vw, 36px), the four cream tiles at 48% of the QR's height (56% on short screens, so the letters hold at 86px on a 1080p wall), and the domain in Bebas at clamp(22px, 2.1vw, 40px). Seats sit in one row to eight and two rows to sixteen with a "+N more" tile beyond, sized from the height that is left after the header, the promise, the join card and the ticker (computed from the same clamps the CSS uses, plus the host bar inset), never taller than 18% of the height (14% in two rows) and never wider than 1.4× their height; the roster is the first thing to shrink and nothing below it clips. Names take up to two lines with the Devanagari face in the stack. One Bebas status line reads the head-count: "BE THE FIRST IN" alone at zero (never "0 PLAYERS IN"), then "N PLAYERS IN · ONE MORE AND WE CAN START" and "· READY WHEN THE HOST IS". A join lands as a callout anchored over the seat band, never over the QR or the code, sized to the band (avatar 62%, name 40% of its height, capped at 170px and 104px), the name in Bebas with the Devanagari fallback, for 1.7s with a two-note sting; joins that land while one is showing play as a single combined callout ("RAVI & MEENA ARE IN!", "RAVI, MEENA AND 3 MORE ARE IN!") with up to three faces stacked, so a rush never hides the roster for long. Under the Pusher fallback the projector polls the lobby every 5 to 7 seconds so the callout is never half a minute late. The ticker reserves two lines at clamp(15px, 1.25vw, 24px), crossfades between facts every ten seconds with the citation smaller and dimmer, ends with "N rounds · Ns per answer", and is the first thing dropped when a screen under 800px tall also needs two rows of seats. Nothing on the screen says "waiting" beside a spinner.

### Overlays & Interstitials (signature)
Phase changes on the projector are announced twice: a full-screen interstitial on rgba(13,27,53,0.88) with Bebas Neue at min(15vw, 120px) for 1.5s ("GET READY", "LET'S SEE WHAT YOU PLAYED", "AND THE WINNER IS…"), then a brief 1.2s overlay word at min(20vw, 160px) in saffron or red ("ROUND 3", "ALL IN", "TIME'S UP"). The phone mirrors the overlay at min(28vw, 96px). Emotes float up the projector for 5s as black 75% blurred cards with a 48px emoji, Bebas label and the sender's avatar. Confetti is 40 pieces in saffron, white, green, gold and navy.

### Timer (signature)
A saffron bar on the phone (24px, sticky) and on the projector's challenge screen (32px), or a 44-radius ring beside the submitted counter. All three turn Buzzer Red at ten seconds with a red glow and a pulse. The remaining seconds sit in Inter bold inside the bar or Bebas inside the ring.

## Do's and Don'ts

### Do:
- **Do** set Bebas Neue capitals at 36px or more for anything the back row must read, and keep verdict prose under 40ch on the projector.
- **Do** keep one saffron-filled control per view; the second action is a ghost.
- **Do** put a real object (a card, a tile, an avatar) at the centre of every phase screen and let it cast the shadow.
- **Do** use Cue-Card Cream only for paper: card faces, code tiles, the QR mat.
- **Do** make phone controls chunky: 48px minimum, 56px for the primary, with the 4px Saffron Lip that compresses on press.
- **Do** tilt dealt things by one to three degrees so they read as placed by hand.
- **Do** ask the product owner for bespoke artwork (mascots, illustrated backdrops, card art) and hand it in as assets rather than approximating it in CSS.
- **Do** carry the tricolour as thin stripes: the 5px page strip, the card-back bars, the podium.

### Don't:
- **Don't** look like a government portal: no official blue headers, emblems, seals or form grids.
- **Don't** look like a generic dark-mode SaaS app: no gray-on-gray cards, purple gradients or dashboard chrome.
- **Don't** look like a kids' quiz app: no rainbow palettes, cartoon mascots or bubble-rounded everything.
- **Don't** look like a political campaign page: no party colours, slogans or candidate photography as the lead.
- **Don't** use gold for anything but winners, or a second green or saffron; the online dot's #22c55e is legacy drift, not a token.
- **Don't** put shadows on panels, chips, bars or inputs; depth belongs to objects.
- **Don't** use bounce, elastic or overshoot easing anywhere; every entrance decelerates on `cubic-bezier(0.16, 1, 0.3, 1)` and thinking indicators wave, they never bounce.
- **Don't** replace the printed card artwork with a CSS rendering of a card.
