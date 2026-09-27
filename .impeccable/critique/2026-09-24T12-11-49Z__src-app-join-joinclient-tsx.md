---
target: join page (src/app/join/JoinClient.tsx)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-24T12-11-49Z
slug: src-app-join-joinclient-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Page never reads the room; avatar can be silently swapped server-side; loading and disabled states look identical (45% opacity) |
| 2 | Match System / Real World | 3 | Plain copy; intro ends on "PLAY NOW" then hands over a form; avatar names hidden in aria-label |
| 3 | User Control and Freedom | 2 | "Tap anywhere to skip" invisible; no cancel for "Waiting for round…"; fixing one code letter forces retyping |
| 4 | Consistency and Standards | 2 | Two label styles on one screen; inline code slots differ from the shared CodeInput; no spotlight/grain/shadows unlike every other screen |
| 5 | Error Prevention | 2 | Clearing a middle slot shifts the rest left; typing into a filled slot is dropped; pasting a link yields H T T P; wrong code found only after Join |
| 6 | Recognition Rather Than Recall | 3 | Code prefilled from QR; taken avatars not shown; no cue where the code lives |
| 7 | Flexibility and Efficiency | 2 | QR deep link is fast; autoComplete off, no autoCapitalize, intro replays on every scan, Join is 17 tab stops away |
| 8 | Aesthetic and Minimalist Design | 2 | 12-tile grid is 55% of the viewport; the one required field is 50px; CTA dim and below the fold |
| 9 | Error Recovery | 3 | In-voice copy, form preserved, auto-retry during a round; but error renders 512px from the slots with no aria-live |
| 10 | Help and Documentation | 1 | No hint where the code is, that the avatar is optional, or that the name appears on the big screen |
| **Total** | | **22/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment:** interchangeable composition carrying specific content. Remove the caricature avatars and the Yatra One wordmark and this is the generic party-game join screen: a centred 400px column, one input, four OTP boxes, a grid, a full-width button. None of "The Sarkari Game Show" stage reaches this page: no saffron spotlight, no film grain, no dealt tilt, no object at centre casting a shadow, no push on the CTA. The QR-path intro is authored for 1920×1080 and arrives as a 375×211 letterboxed strip in a different palette from the page it hands off to.

**Deterministic scan:** CLI detector, 4 advisory "colour outside DESIGN.md" hits: three `#fff` in JoinClient.tsx (lines 95, 115, 130) are prose-sanctioned false positives; one `rgba(255,255,255,0.45)` on the "Choose Your Avatar" label (AvatarPicker.tsx:61) is real drift from the cream House Light 45 token. In-page detector at 375×812: 0 findings on both /join?code= and /join.

**Visual overlays:** injection succeeded on both paths at the time, but the browser tabs were closed when the desktop app stopped the preview during the session-limit outage. No overlay is visible now; the console reported "No anti-patterns found" on both pages.

## Overall Impression

The fast path works (QR → prefilled code → name → lobby in about a second) and the copy is in voice. Everything else fights it: a ten-second film first, twelve faces between the required field and the button, and a Join button that is off-screen on every common phone and dimmed when it appears. The page owns two emotional valleys and no peak; the peak (seeing your seat marked YOU) happens on the next screen.

## What's Working

- **The QR fast path once the intro is gone.** Code prefilled and saffron-bordered, focus in the name field, one tap to the lobby. The "round in progress" state auto-retries every 4 s with honest copy instead of dead-ending.
- **The code slots as a pattern.** 53×60 targets, saffron on fill, I and O excluded on client and server, uppercase forced, a bare pasted code fills all four, Backspace on an empty slot steps back. They rhyme with the dealt tiles on the projector.
- **Error copy is in the game's voice and preserves work.** "Room not found — check your code", "This game has ended — start a new one!"; name, code and avatar survive an error.

## Priority Issues

- **[P1] The primary CTA is below the fold on every common phone, and dimmed when it appears.** Join sits at 779–831px in an 812px viewport (33px visible), 112px below the fold at 375×667, below the fold even at 1024×768. Disabled state is 45% opacity, a muddy brown bar. **Why:** principle 2 (one action at a time on the phone) and 4 (zero friction); a stranger does not know a button exists. **Fix:** sticky bottom Join inside the safe area, full saffron always, disabled reason on the button ("Enter your name to join") not opacity; shrink the avatar picker to a single scrolling 56px row or collapse it behind "Pick an avatar (optional)"; give the button the 4px Saffron Lip and press translate. **Suggested command:** /impeccable layout
- **[P1] The 10-second intro on the QR path is the slowest thing on the fastest path and does not fit the phone.** Fires on every ?code= landing; 1920×1080 stage scaled to 0.195 renders a 375×211 strip; Skip is 79×36 with 12px text; the last frame is a fake "PLAY NOW" about 48×12px; palette and typeface differ from the page beneath. **Why:** the host and the room are waiting; a letterboxed strip at 26% of the screen is the opposite of confident animation. **Fix:** drop the intro from /join?code= (the projector has just shown the wordmark) or re-choreograph a ≤2.5 s portrait cut ending with the name field focused; if kept, 44px Skip and "tap to skip" printed on the overlay. **Suggested command:** /impeccable distill, then /impeccable animate
- **[P1] The page never reads the room, so there is no context before Join and no validation before the error.** No fetch on load or on the fourth character; a wrong code is found only after submit; the error lands 512px below the slots with no role="alert". **Why:** this is the moment a stranger commits; "Room XSZQ · 3 players waiting" turns a blind form into an invitation and catches the wrong code before the tap. **Fix:** fetch the room when four characters are present; one status line under the slots (role="status"): Flag Green "Room found · 3 players waiting" / Buzzer Red "No room with this code"; on server error move the message under the slots, red slot borders, focus slot 1; add "Your name and avatar show on the big screen." **Suggested command:** /impeccable harden
- **[P2] Editing the code is broken in three ways.** Clearing a middle character shifts the rest left (P Q M S → P M S _); typing into a filled slot is dropped (maxLength 1, no select-on-focus); pasting a link or message gives H T T P or J N M Y. **Why:** fixing one letter is the most common recovery action and it scrambles the field. **Fix:** fixed four-element array, select-on-focus (reuse ui/CodeInput.tsx which already does this), extract the first valid four-letter token or the code= param on paste, autoCapitalize="characters", hint when I or O is stripped. **Suggested command:** /impeccable harden
- **[P2] The avatar picker hides what is taken and what you got.** resolveAvatar() replaces a taken avatar silently; no taken state; names only in aria-label; the dice tile is aria-pressed=false forever; no radiogroup. **Why:** the one playful choice can be overridden and the player finds out on the projector. **Fix:** dim taken tiles with the owner's name once the room is fetched; show "You're Top Gun" under the grid; say so in the lobby if overridden; labelled radiogroup; Random as a small text action, not a 106px tile. **Suggested command:** /impeccable clarify

## Persona Red Flags

**Jordan (first-timer):** the film ends on a "PLAY NOW" that cannot be pressed; on the manual path the keyboard opens in Room code while Your name above it is empty; eleven near-identical caricatures with no names and no "optional"; no visible button at landing; after a wrong code nothing near the code changes.

**Casey (one thumb, noisy hall):** scrolls 87–112px past 12 tiles to reach Join; code keyboard opens lowercase alphabetic; tapping a filled slot does nothing and backspacing a middle letter scrambles the rest; name autofill disabled; Skip is 36px tall; a reload during "Waiting for round…" loses everything.

**Sam (keyboard and screen reader):** Join is disabled until valid so it is absent from the tab order (17 stops, no Join, no explanation); errors and the waiting state are never announced; the avatar grid has no group role and its heading is a <p>; the Room code label has no htmlFor. Positives: global 2px saffron focus ring; reduced motion skips the intro; Escape dismisses it.

## Minor Observations

- Three label styles on one screen; none is the Tape-Label spec (Inter 600, House Light 70/45).
- Avatars are "real objects" in DESIGN.md but sit flat with 1.5px 10%-white borders; the dice tile is the page's only gradient and a second saffron surface.
- Join has no :active state; loading and disabled are the same 45% opacity.
- Name maxLength 20 on the client vs 30 on the server; no counter; a Devanagari name can be cut mid-syllable.
- Slots use space-between; an 8–12px gap would read as one code. Page padding is 20px against the 16px gutter.
- Focus is placed on the hidden name input during the intro; Space to type a name dismisses the intro.
- "Waiting for round…" cannot be cancelled except by leaving.

## Questions to Consider

- Does the avatar choice belong on the join page at all, when the server already assigns a distinct default and the lobby has time to spare?
- Should the QR path ever play the intro?
- The dominant visual for a walk-up stranger is eleven caricatures of one recognisable public figure, next to a "political campaign page" anti-reference. Is that the intended first impression at a public stall?
- Should the page say the name will be on the big screen?
- Code first or name first? The manual path focuses the code; the visual order should agree.
