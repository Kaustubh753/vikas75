---
target: projector lobby (src/components/projector/ProjectorLobby.tsx)
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-24T12-11-49Z
slug: src-components-projector-projectorlobby-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | At 0–1 players the copy is false ("waiting for host to start", "Waiting for the host to deal…"); sliders save silently; "just joined" chips never expire; nothing signals "you can start now" |
| 2 | Match System / Real World | 3 | Card-table language fits; ✕ for End Game reads as "close" |
| 3 | User Control and Freedom | 2 | Kick is one click with no confirm; no rename; no settings reset |
| 4 | Consistency and Standards | 2 | Two mute controls with independent state; bar chrome is cool navy on the warm stage; one count in three phrasings; zero Bebas Neue against the Back-Row Rule |
| 5 | Error Prevention | 2 | Start Game never disabled; fails after the click with 10px red text 600px from the button; Kick unguarded |
| 6 | Recognition Rather Than Recall | 2 | Five unlabeled emoji buttons with hover-only tooltips; rounds and timer hidden behind ⚙ |
| 7 | Flexibility and Efficiency | 1 | One rigid path; no keyboard accelerator, no auto-start threshold, no presets, no game shorter than 5 rounds |
| 8 | Aesthetic and Minimalist Design | 2 | Attribution twice; four idle signals at once; 130–170px dead bands at 1920×1080 because every dimension caps at its 1440 value |
| 9 | Error Recovery | 2 | "Need at least 2 players" names the fix; "Network error" and "Could not advance" do not; all errors at 10px red far from the action |
| 10 | Help and Documentation | 1 | The room gets no "what is this game" beyond a 10px ticker cap; /how-to-play unlinked; host help is tooltips only |
| **Total** | | **19/40** | **Poor (47.5%)** |

Heuristics 7 and 9 were scored on the host bar, which shares this screen; audience-only scoring (7 and 9 n/a) gives 16/32, the floor of Acceptable.

## Design Specificity Verdict

**LLM assessment:** authored in the props, category-interchangeable in the staging. The cream code tiles, the V·75 QR badge, the caricature avatars in saffron rings, the verified "Did you know" facts and "quiet so far. someone always breaks it." are unmistakably Vikas 75. Remove them and the skeleton is the stock quiz-platform lobby: logo top-left, live status top-right, a centred glass card with QR and code, a row of avatar cards, a spinner, a ticker. The system's own North Star is not delivered here: there is no Bebas Neue anywhere in the lobby, the largest type is the 53px tile letters, and every instruction is Inter at 10–14px. The lobby is a well-dressed waiting room in front of a game show that starts one screen later.

**Deterministic scan:** CLI detector, 33 advisory "colour outside DESIGN.md" hits (28 in HostOverlay.tsx, 4 in ProjectorLobby.tsx, 1 in ProjectorView.tsx). 22 are true drift: the host bar's entire white-alpha text ramp (0.35 to 0.85) where the system uses cream House Light, its 10% white borders where Hairline is cream 0.14, and four undocumented `rgba(7,16,31,x)` chrome alphas. 11 are false positives (prose-sanctioned #fff, the documented 0.92 chrome, spec-documented icon-button values, a text-shadow). In-page detector at 1024×768: host variant 23 groups / 26 findings (14 undersized functional text at 8–10px, 3 all-caps body blocks, 3 tiny 11px bodies, 3 READY chips at 2.4:1 contrast on the navy seat, 2 clipped-overflow containers, Inter at 78% of text); plain view 17 / 20; host variant at 1920×1080 16 / 19, where the fixed 10px items and the contrast pairs remain. The two clipped-overflow hits are the projector shell's intentional full-screen clip and carry no user impact.

**Visual overlays:** injection succeeded on the host and plain views at the time, but the browser tabs were closed when the desktop app stopped the preview during the session-limit outage. No overlay is visible now; the console findings above are the record.

## Overall Impression

The objects are right and the stage is wrong. The dealt tiles and seats are the product; everything around them is sized for a laptop and labelled for the host. The one job of this screen, get phones into the room from across a hall, is undermined by a 140px QR and 11px instructions. The wait builds no anticipation, and the host bar reads as chrome. The biggest opportunity is a TV type scale with the QR as the hero object.

## What's Working

- **The dealt code tiles.** 76×100 cream tiles, Yatra One at 53px, the tilt set, saffron pip, paper-edge highlight and the heavy Code-tile shadow: real objects under the one lamp, and unmistakably this product. Excluding I and O is a quiet, correct detail.
- **The seat metaphor.** A filled seat beside a dashed "open seat" says "there is a chair for you" with no copy; vkSeatIn is the right instinct for the join beat, at the wrong scale.
- **The host bar's centre and its guardrail.** One 44px saffron START GAME pill, "Working…" while pending, a proper End-game modal with Cancel. The Spotlight Rule holds. The 20 ticker facts are verified and cited.

## Priority Issues

- **[P1] The QR cannot be scanned from where the room sits.** qrSize caps at 140px (7.3% of a 1920 canvas); the V·75 badge covers 26% at error-correction M. **Why:** a 2m projection gives a 14.6cm code, scannable from about 1.5m; PRODUCT.md's hardest case is a projector read from across the room. **Fix:** QR as the hero at 28–30vh on the cream mat, level H if the badge stays (or badge ≤15%); code tiles beside it at 120–140px letters; drop the 140/76/166 caps and size in vh/vw so a TV gets a TV layout. **Suggested command:** /impeccable layout
- **[P1] The type scale contradicts the Back-Row Rule.** No Bebas Neue on screen; at 1920×1080 "SCAN TO JOIN" 11px, "ENTER THE ROOM CODE" 11px, the URL 14px, the status line 11px at 45% alpha, banter 13px, ticker 14px, "5 ROUNDS · FUNNIEST WINS" 10px, seat names 17px, "ready" 10px. Detector agrees: 14 undersized labels and 3 READY chips at 2.4:1. **Why:** every instruction is a tape label the host can read and the room cannot; names, the one thing each player looks for, are 17px. **Fix:** a TV scale: "SCAN TO JOIN" / "OR TYPE THE CODE" as Bebas 40–48px, URL 32px+, seat names ≥28px with the Devanagari face in the stack, subtitle 36px+, ticker 24px+ on one line with a 10 s dwell; Inter for the host bar only; READY chip to AA. **Suggested command:** /impeccable typeset
- **[P1] The screen never says what the game is or why to scan.** The only promise is "5 ROUNDS · FUNNIEST WINS" at 10px and "Play for Progress" at 16px; at 0–1 players the copy is false. **Why:** principle 1 (land with someone who has never seen the game) and 4 (say it is free, no sign-up). **Fix:** one poster line in Bebas 40px+ with a Hindi line: "PICK A SARKARI SCHEME · DEFEND IT IN 25 WORDS · FUNNIEST ANSWER WINS", eyebrow "No app, no sign-up, 30 seconds to join"; state-aware idle copy (0: "Be the first in", 1: "One more and we can start", 2+: "Ready when the host is"); retire the spinner. **Suggested command:** /impeccable onboard
- **[P1] Players 7+ never appear on the stage, and the join moment is inaudible.** MAX_VISIBLE = 6; after that a "+N MORE" tile; the join beat is a 0.55 s rise of a 166px tile with a 17px name, or a 13px chip, with no sound. **Why:** at a 15-player fest nine people look for themselves and find a numeral; the moment that should make a stranger feel seen is the smallest event on screen. **Fix:** two-row grid to 16 seats; "+N" only beyond; a 1.5 s callout with avatar and name at Bebas 72px ("BHARAT IS IN!") and a short SFX; chips that expire. **Suggested command:** /impeccable delight
- **[P2] The host bar reads as chrome, not controls, and its guards are missing.** Five unlabeled emoji buttons with ✕ (End) first; Start enabled at 0–1 players with the failure 600px away; Kick one-click with no confirm and no row hover; two mute controls; silent settings save; a dangling "· 3 players" separator; 22 token-drift colours. **Why:** a volunteer running three games a day mis-clicks; the two mute icons disagree the first time she uses one. **Fix:** text labels under icons, End to the far right; disable Start below 2 with the reason in the pill; two-step Kick beside the name with row hover; one mute source of truth; "Saved" feedback and "5 rounds · 90s" echoed in the bar; move the bar onto the cream text tokens. **Suggested command:** /impeccable clarify, guards under /impeccable harden

## Persona Red Flags

**Jordan (walk-up stranger at a stall):** no offer, cost or time on screen; the 140px QR forces him to walk to the wall; the saffron badge reads as a watermark and is a scan gamble at level M; "Waiting for the host to deal…" beside a spinner reads as "loading, don't join yet"; the banter line is a 13px system whisper.

**Meera (volunteer host, third game of the day):** can press START at 0–1 players and the reason appears 600px away at 10px; Kick is the only way to fix a name, unconfirmed, a screen-width from the name; five emoji buttons with no labels and ✕ leftmost; two mute buttons that disagree; sliders with no saved confirmation and no game under 5 rounds.

**Riley (stress):** 0 players shows two false statuses; "Meena Kumari Lakshmanan" truncates at 166px; 15 players gives six seats plus "+9 MORE" and at 1280×720 names drop to 14px; Devanagari names render through the OS fallback because the seat font stack has no Devanagari face; at 17 players "+11" in 50px saffron is the largest numeral on screen; "just joined" chips never expire; 25-word facts with citations wrap to two lines and rotate every 5.2 s; avatars repeat past 11 players.

## Minor Observations

- Attribution appears twice (10px eyebrow and 11px footer). Four idle signals at once.
- "Play for Progress" and the "Did you know" label spend saffron decoratively.
- vkFactIn is the only recurring motion and it moves the element nobody can read.
- The bar's cool navy chrome seams against the warm stage; the spinner pill uses the 8px ticket corner among 18px objects.
- House Light 45 at 11px is about 4.3:1; the floating MuteButton nearly touches "ROOM OPEN · N JOINED" at the pane width.

## Questions to Consider

- Is this one lobby or two? A stall wants a 40%-of-screen QR and a 3-round game; a fest wants the roster.
- Should the wait be an attract loop (promise → how it works → QR → who's in) rather than a static card?
- Who is the ticker for? If the room, 28px+, one line, 10 s dwell, no citation on screen.
- Where does Hindi live on the projector?
- Should the roster leave the projector at high counts and the stage be reserved for the join callout?
- When the second player arrives, should the screen change state and the host's pill light up?
