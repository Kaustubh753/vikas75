---
target: landing (src/app/page.tsx)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-25T12-59-33Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent) — second run, after the polish and animate passes

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Host shows "Creating…" with aria-busy; the film has no progress cue and keyboard focus could sit behind the curtain |
| 2 | Match System / Real World | 3 | Step copy fluent; the desktop hierarchy never said what the game is |
| 3 | User Control and Freedom | 3 | Tap, Skip, Esc, Space, Enter dismiss; Host creates a room on one click |
| 4 | Consistency and Standards | 3 | On-token; emoji music toggle instead of the icon token |
| 5 | Error Prevention | 3 | Double-submit guard, code redirect, returning-player routing |
| 6 | Recognition Rather Than Recall | 3 | Labelled buttons; the logo was a nameless-purpose button first in tab order |
| 7 | Flexibility and Efficiency | 3 | Return sting, auto-routing, deep links, keyboard skip |
| 8 | Aesthetic and Minimalist Design | 3 | Nine targets in the bottom strip on a two-button page |
| 9 | Error Recovery | 3 | Plain toasts, state preserved |
| 10 | Help and Documentation | 3 | The page teaches; "Full rules →" was 10px |
| **Total** | | **30/40** | **Good (75%)** |

Heuristics 7 and 10 were scored this time because the surface genuinely provides accelerators and in-page help.

## Design Specificity Verdict

**LLM assessment:** bespoke. The intro is a hand-built film of the printed deck composing to the live viewport, the landing deals the same real cards on the warm-black stage, the CTAs are the system's ticket-sharp entry buttons, and the copy has a voice. The one generic component is the How-to-play panel, which carries the teaching job.

**Deterministic scan:** CLI detector clean on page.tsx and IntroAnimation.tsx (0 findings, no suppressions). In-page detector at 1024×768: 11 elements / 12 warnings (two all-caps tape labels, three 10px labels at the narrowest laptop width, five 11px step bodies, one wide-tracked link, and a width transition traced only to the Next.js dev badge); mobile 3 (two tape labels, one tracked link). No low-contrast findings on either layout, down from 17 artefact hits in the first run.

**Visual overlays:** injection succeeded on desktop, mobile and desktop again; the [Human] tab was left open with the 11 badges.

## Overall Impression

The curtain-to-stage handoff and the role-aware entry now work; the truth of the copy is fixed. What remained was the premise itself, which the desktop never stated in one glance, and keyboard modality during the intro.

## What's Working

- **The curtain-to-stage handoff.** One physical metaphor across two palettes: the intro deals the deck's scans on Intro Paper and resolves to the wordmark; the landing deals the same cards on Studio Black.
- **Role-aware entry.** Host filled and Join ghost on desktop; Join filled on the phone; both 52px with Ink on saffron at 8.7:1; focus lands on Host the instant the intro leaves.
- **Copy that tells the truth in the compère's voice.** Seven cards, 25 words, ninety seconds by default, most rounds won, all matching the engine.

## Priority Issues

- **[P1] The desktop never stated the premise in one glance.** The wordmark and tagline ran straight into Host a Game; the only sentence saying this is a party game about defending a scheme was 12.7px panel text. **Fix:** one Bebas line under the tagline, the lobby's own poster line. **Suggested command:** /impeccable clarify. **Status:** fixed in this session.
- **[P2] The intro was not modal to the keyboard, and its two skip affordances collided on phones.** Tab moved behind the curtain; at 375px "TAP ANYWHERE TO SKIP" was clipped behind the Skip pill. **Fix:** `inert` on the page while the curtain is up; the printed hint only where it has room. **Suggested command:** /impeccable harden. **Status:** fixed in this session.
- **[P2] The card fan is a decoy, not a teacher.** Six real scans that lift and glow but reveal nothing, and six tab stops between Join and Full rules. **Fix:** on pick, print the card's name and one line beside it; or make the fan decorative and drop tabIndex. **Suggested command:** /impeccable delight. **Status:** open.
- **[P2] The rules panel was set below reading size.** Bodies 11.26px at 1280 wide, "Full rules →" 10px. **Fix:** titles 14 to 16px, bodies 12 to 13px, labels never under 11px, a 44px row for the link. **Suggested command:** /impeccable typeset. **Status:** floors raised in this session; the five steps stay five.
- **[P3] Chrome drift and loose ends.** Emoji music toggle; the wordmark was a focusable easter-egg button; a phantom scroll range during the deal; "by default" missing from the ninety seconds. **Status:** the logo is no longer focusable and the copy says "by default"; the emoji toggle and the deal-time scroll range are open.

## Persona Red Flags

**Jordan:** a ten-second film before content on a link they did not ask for (skippable); on desktop no plain statement of the premise (now present); "Host a Game" does not say it opens the big-screen lobby.
**Riley:** Tab during the intro went behind the curtain (now inert); six presses through the fan from Join to Full rules; reduced motion collapses the deal to end states.
**Casey:** the clipped skip label for the whole first-visit film (now hidden on narrow stages); 16 WebP preloads before content on a first visit; 150px of dead space between rule 03 and Join.

## Minor Observations

- Contrast is not the problem, size is: every flagged label was 10 to 11px on high-contrast colours.
- Step numerals are Inter where the Title spec names Yatra One.
- The landing attempts lobby music on mount from a saved preference.
- The intro's wall clock stalls in a background tab and jumps to its end when viewed.
- No Hindi on the desktop landing while the lobby carries a Hindi line.

## Questions to Consider

- Should the lobby's poster line be the landing's headline too? (It now is.)
- What should a picked card do? If nothing, should the fan be focusable?
- Does "Host a Game" need to say where it goes?
- Do six social icons and a music toggle belong on the entry page, or on the game-over screen?
- Is one Hindi line on the landing the cheapest way to honour "never English-only in spirit"?
