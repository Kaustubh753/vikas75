---
target: landing page (src/app/page.tsx)
total_score: 18
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 3
timestamp: 2026-09-24T12-11-49Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | 10.4 s intro with no progress cue or skip hint; "Creating…" is a label swap with no disabled or aria-busy state |
| 2 | Match System / Real World | 2 | Rules copy describes a different game: "dealt four" (engine deals 7), "Sixty seconds" (90 s), "absurd policy proposals" (real schemes) |
| 3 | User Control and Freedom | 2 | Intro replays on every load with no memory; carousel auto-advances with hover-pause only |
| 4 | Consistency and Standards | 1 | Two brands in ten seconds; intro artwork drops "the Office of Shri" from the attribution; three contradictory rule sets; DESIGN.md's 52px entry button ships at 38px |
| 5 | Error Prevention | 3 | Nothing destructive; only gap is that any accidental tap dismisses the intro |
| 6 | Recognition Rather Than Recall | 2 | Fan cards give a pointer cursor and nothing else; keyboard skip undiscoverable; desktop has no route to the full rules |
| 7 | Flexibility and Efficiency | n/a | Persuade surface with two actions; the one accelerator that matters (past the intro) is scored under 3 |
| 8 | Aesthetic and Minimalist Design | 2 | Right column is a 225×683 box holding about 150px of content; saffron spent on tagline, numeral, counter, arrows, dot and music glyph |
| 9 | Error Recovery | 3 | Clear toasts; button resets |
| 10 | Help and Documentation | 1 | The on-page help is wrong and partial; the accurate page is unlinked on desktop and disagrees with both |
| **Total** | | **18/36** | **Acceptable (50%)** |

## Design Specificity Verdict

**LLM assessment:** authored in the middle, interchangeable at the edges, and split across two brands. The intro (seven real cards dealt into a fan, collapsing into pixel-skyline letters, the arrow from the A launching on a tricolour trail) is the most authored artefact in the product. The fan is specific because it is the real deck. The copy voice is specific. The logo lockup, the How-to-play carousel (dark glass, arrows, pill dots, "01 / 05", 5.2 s auto-advance) and the bottom strip are stock. At 10.4 s the intro's brand (cream paper, #173458 ink, Press Start 2P, a pixel wordmark, #ee7d23) is discarded for the landing's (#08070f, white Yatra One, Inter caps, #FF9933). The most specific thing on the page is the thing the page throws away.

**Deterministic scan:** CLI detector, 14 hits: 1 real layout-transition (the dot-nav width animation, page.tsx:386), 2 side-tab false positives (the CSS triangle in the intro's PLAY NOW pill), 11 colour-outside-DESIGN advisories of which 5 are true drift (the how-to-play panel gradient rgba(5,11,28,.85) and four alphas of the intro's own #173458 ink) and 6 are prose-sanctioned white. The scanner did not flag the intro's palette constants (#f6efd8, #fdf8e8, #173458, #ee7d23, #1fa24a), none of which are tokens. In-page detector at 1024×768: 23 groups; the 17 low-contrast entries are an artefact (the detector read the how-to-play panel's 5%-alpha saffron gradient stop as an opaque backdrop; recomputed ratios are 9:1 to 19:1) and are false positives. The 6 real hits: 10px functional text on "Host a Game" and "Join a Game", 8px on the "How to play" eyebrow and "01 / 05", 9px on "Curious what's in the deck? →", five 10px step bodies, uppercase on the 48-character attribution and the © line, wide tracking on the deck link. Mobile 375×812: 3 hits (uppercase attribution, wide tracking, 10px © line).

**Visual overlays:** injection succeeded on desktop and mobile at the time, but the browser tab was closed when the desktop app stopped the preview during the session-limit outage. No overlay is visible now.

## Overall Impression

A superb ten-second curtain-raiser hands off to a page in a different costume, whose one job (the press on Host or Join) is the smallest thing in its own column, and whose only rules copy describes a game the engine does not play. Fix the truth of the copy, the gating of the intro, and the weight of the CTA and this page becomes what the intro promises.

## What's Working

- **The intro's central idea.** Real printed cards collapsing into pixel-skyline letters and the arrow lifting on a tricolour trail. It is product-true (the deck, the 75, vikas as the upward arrow) and nobody else could ship it.
- **The fan is the real deck at readable scale at 1440×900.** Heavy dealt-card shadows, small tilts, hover lifts, click brings a card front and dims the others. It looks handled, not rendered.
- **Voice and the decision.** "They'll show up. They always do.", "Logic optional. Conviction mandatory.", "all rounds reserved"; the Host / Join filled-and-ghost pair is unambiguous with visible focus rings and 8.8:1 label contrast.

## Priority Issues

- **[P1] The How-to-play carousel teaches the wrong game.** "dealt four absurd policy proposals" (HAND_SIZE is 7; the fan shows five), "Sixty seconds" (default 90 s), "Five rounds" as a rule; no 25-word cap, no AI judge, no setup model. /how-to-play says 7 cards, 25 words, "highest score wins" (rounds won decides). Desktop has no link to it. The carousel timer runs under the intro so the first slide seen is "03 / 05". **Why:** it is the only rules surface a desktop host sees; "absurd" contradicts the learning outcome and is a liability on a page attributed to an MP's office. **Fix:** rewrite the five steps from engine truth, step 01 stating the model ("One laptop or TV shows the game. Everyone else plays from their phone. No accounts."); "real government schemes"; add "Full rules →" on desktop; reconcile /how-to-play; start the timer after the intro dismisses. **Suggested command:** /impeccable clarify
- **[P1] The intro is a 10 s gate on every load, unadapted to phones, and hands off to a different brand.** No seen-memory on / or /join; at 375×812 a 375×211 strip; Skip 79×36; "PLAY NOW" is a div; white wash then a cut to #08070f; logo_top_navy.webp reads "An initiative of Office of Sujeet Kumar"; the fan's own deal animation plays behind the opaque overlay so nobody sees it. **Why:** a queue at a stall, a toll booth for a reloading player, and a broken brand commitment. **Fix:** full play once per device then a ≤2 s sting; never on /join?code=; a portrait cut under 768px; land on the page's wordmark or adopt the pixel-skyline wordmark as the lockup; make PLAY NOW a real button that lands focus on Host a Game; regenerate the artwork with the full attribution; 44px Skip. **Suggested command:** /impeccable animate
- **[P1] Accessibility gaps.** Carousel auto-advances every 5.2 s with no pause control and no aria-live (WCAG 2.2.2, Level A); under reduced motion the JS timer keeps swapping; the fan is mouse-only divs; the first Tab stop is an unnamed button around the H1 (the easter egg); "Curious what's in the deck? →" at about 3.0:1 and the © line at 3.7:1; inactive dots at 1.9:1; the eyebrow renders at 8px. **Fix:** visible pause toggle and aria-live="polite" or no auto-advance; stop the timer under reduced motion; fan as decorative or named buttons; aria-label on the logo button; strip text ≥ .55 alpha; eyebrow floor 10px; "press Esc to skip" on the Skip label; accept e.key. **Suggested command:** /impeccable harden
- **[P2] The primary action is the smallest thing in its own column.** Host a Game is 261×38 with 10px text at 1024×768 (clamp gives 38px on any viewport under 1238px tall; DESIGN.md says 52px); the spotlight sits behind the fan, not the CTA; the saffron step numeral outweighs the CTA label; the fan glows and leads nowhere. **Fix:** 52px flat height, 14px label; spotlight on the lockup and buttons; demote the numeral; shrink the fan or give a click a destination. **Suggested command:** /impeccable layout
- **[P2] The mobile landing puts the buttons where the thumb isn't and teaches nothing.** Host at y=199–251, Join at 263–315, then 330px of nothing; footer targets 17–18px tall; no rules content, only a 12px link. **Fix:** lockup on top, a three-line rules strip, the CTA pair anchored to the lower half above the safe area; 44px on every link; consider Join as the filled primary on phones. **Suggested command:** /impeccable adapt

## Persona Red Flags

**Jordan (stranger with a link):** the intro ends on a "PLAY NOW" that is not a button, then a different logo and colour world; "Host a Game" with no cost or requirements; step 01 implies an online game; "Play your scheme." is jargon; a click on the fan lifts a card and nothing follows; no way to learn more on desktop; the first slide read is "03 / 05".

**Riley (second visit, short viewport, keyboard, reduced motion):** the full 10.4 s again on / and /join; at 1280×720 a picked challenge card nearly touches the tricolour strip; at 1024×768 an 8px eyebrow and 10px CTA label; Tab 1 lands on an unnamed button; the fan is unreachable; dots lack aria-current; the carousel keeps advancing under reduced motion; "Creating…" is a label swap with hover still lifting.

**Casey (phone, one thumb):** a 375×211 strip in a black screen for 10 s; Host/Join in the upper third with 330px of nothing below; 18px social targets; no rules on the phone; lobby music may autoplay from a saved preference; arriving via QR plays the intro again.

## Minor Observations

- The fan's selected glow is Trophy Gold, reserved for winners; the challenge glow is a periwinkle not in the palette.
- A picked scheme card and a picked challenge card can both be front at once.
- The step numeral is the loudest type in the right column while the title it numbers is 12–19px; the arrows sit 300px from the text they page.
- "Play for Progress" is Inter 400 at 12–19px under a 78px wordmark and reads thin.
- Two tricolours in ten seconds (intro saffron and green versus the page strip). Up to three brand marks in circulation (pixel skyline, Yatra One lockup, the OG image).
- The H1 is wrapped in a nameless button for a seven-click easter egg. No landmarks; "How to play" is a div, not a heading.
- "all rounds reserved" is cut on mobile.

## Questions to Consider

- Which wordmark is the brand: the pixel skyline the intro builds, or the Yatra One lockup the site uses?
- Should the landing's first teaching be the setup model rather than the rules?
- Is the intro for the room or for the person? Could it play on the projector and once per device on /?
- Does the fan need to be interactive if it cannot lead anywhere?
- Should the rules auto-advance at all?
- On phones, should Join be the filled primary?
- Who owns the rules copy? Rendering the numbers from engine constants would stop the drift.
