---
target: projector lobby (src/components/projector/ProjectorLobby.tsx)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-25T12-59-33Z
slug: src-components-projector-projectorlobby-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent) — second run, after the polish and animate passes

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Room-open dot, head-count copy, "Saved ✓", "Working…"; nothing shows real-time has degraded to the idle poll (a join surfaced 28 s late) |
| 2 | Match System / Real World | 3 | Compère copy is right; READY on every seat implied a step nobody took; two counters of one number; "0 pts" in a lobby |
| 3 | User Control and Freedom | 2 | Escape closed nothing; no undo on Remove; no route back to hosting after a lost tab |
| 4 | Consistency and Standards | 3 | System applied faithfully; avatar shape drifted (circle, rounded square, square); Inter beside Bebas in the callout |
| 5 | Error Prevention | 3 | Start guard, End behind a modal, two-step Remove; "Yes, remove" was the filled, first, 30px option |
| 6 | Recognition Rather Than Recall | 3 | Every glyph labelled; the disabled reason at 55% opacity; the code tiles vanished behind the callout |
| 7 | Flexibility and Efficiency (host bar) | 1 | One rigid mouse path: no Esc, no rename, no way to act on several players |
| 8 | Aesthetic and Minimalist Design | 3 | Strong stage aesthetic; noise from duplicate counters, READY chips, a footer repeating the poster |
| 9 | Error Recovery (host bar) | 2 | "Could not advance" with no next step, rendered top-centre on the shared screen |
| 10 | Help and Documentation | 2 | The room gets inline help; the host gets tooltips only |
| **Total** | | **25/40** | **Acceptable (62%)** |

## Design Specificity Verdict

**LLM assessment:** specific, not templated, but specific at laptop scale rather than hall scale. Cream code tiles dealt at a tilt with a saffron pip, the cream QR mat with its V·75 badge, a Bebas poster line in the compère's voice, a Devanagari second line, pixel-art avatars in navy seats, a verified-facts ticker, grain and a saffron spotlight. The slip: the composition was a 1440px landing page projected, with the persuasive copy at chrome size and the host chrome stock (emoji glyphs over 9px labels).

**Deterministic scan:** CLI detector clean on ProjectorLobby.tsx, ProjectorView.tsx and HostOverlay.tsx (0 findings, no suppressions). In-page detector: 14 warnings on the host view, almost all 9 to 10px bar labels (since raised to 11px) and the all-caps tape labels; the plain projector view clean apart from the tape labels.

**Visual overlays:** injection succeeded on the plain and host views at 1920×1080, 1280×720 and 1024×768.

## Cognitive Load

3 of 8 checks failed (single focus, minimal choices in the host bar, working memory: the code tiles vanished for 1.7 s at every join) → moderate load.

## Overall Impression

The join card and the guardrails are right; what remained was composition under load. Names truncated from three players, the join moment covered the QR it was celebrating, a 720p laptop with the host bar overflowed at 17 players, and the host bar had no keyboard path.

## What's Working

- **The dealt code and the QR mat.** 86px Yatra letters on cream tiles at −3°/1.5°/−1°/2.5° beside the cream mat: the concept lands in one glance and reads from the back of a hall.
- **Head-count-aware copy plus open seats.** Dashed "+ OPEN SEAT" tiles and a status line that speaks ("ONE MORE AND WE CAN START") invite instead of saying "waiting".
- **The host bar's guardrails.** One saffron pill with its reason on the label, End behind a modal with the safe option focused, Remove as a two-step, sliders that echo "Saved ✓".

## Priority Issues

- **[P1] Names truncated at three players.** Seats were sized from the height alone, names on one line at 17% of the seat width: "Priyanka Rao" became "Priyanka…" with 1,650px of row unused; Devanagari names cut mid-conjunct. **Fix:** seats take the row's free width (to 1.4× their height), names wrap to two lines, long names step down a size, the smallest seats trade a little avatar for the second line. **Suggested command:** /impeccable typeset. **Status:** fixed in this session; verified at 1080p (29px names, none clipped under 18 characters) and 720p with 17 players (16px, two lines).
- **[P1] The join moment covered the QR, and arrived late under the fallback.** The callout was centred over the join card for 1.7 s per join, serially; the lobby polled every 30 to 38 s when Pusher was down. **Fix:** the callout is anchored over the seat band and sized to it, bursts coalesce into one callout ("RAVI, MEENA AND 3 MORE ARE IN!"), the lobby polls every 5 to 7 s. **Suggested command:** /impeccable animate. **Status:** fixed in this session; verified: callout band at y 774 against a QR bottom of 687 at 1080p, one combined callout for a three-player burst.
- **[P1] The QR was not the hero it is specified to be.** 281px at 1080p against a 550px tile row; 158px at 720p. **Fix:** 30% of the height (24% short, 23% two rows), tiles at 48% of the QR so the letters keep their 86px. **Suggested command:** /impeccable layout. **Status:** raised in this session (324px at 1080p; the 720p floor stays 150px, where the roster and the ticker give way first).
- **[P1] 720p with the host bar overflowed under load.** The body overflowed by 83px at 17 players; the second seat row was cut through the names and the status line was gone. **Fix:** the seat band is sized from the height actually left (a budget from the CSS clamps plus the host bar inset), the ticker is the first thing dropped on a short two-row screen. **Suggested command:** /impeccable adapt. **Status:** fixed in this session; verified at 1280×720 with 17 players: 16 seats and "+1 more", status line clear of the bar, no overflow.
- **[P2] Host bar keyboard, targets and placement.** Escape did nothing; the invisible HOST ▲ pill stayed in the tab order; emoji glyphs; 30px confirm buttons with the destructive one filled and first; the panel covered the seat names at 1080p and the QR's lower third at 720p; toasts top-centre on the shared screen. **Fix:** Escape closes the dialog then any drawer; the hidden pill leaves the tab order; stroke icons; Keep first and focused with "Yes, remove" outlined at 36px; panels as right-hand drawers of min(380px, 23vw) that clear the join card; toasts bottom-right above the bar with a next step in the copy. **Suggested command:** /impeccable harden. **Status:** fixed in this session; verified at 720p and 1080p. Open: no rename (kick and rejoin only), no host help beyond tooltips.

## Persona Red Flags

**Jordan:** from five metres the instruction was a third the size of the code; the reassurance line is the smallest on the stage; every seat said READY (gone); the tiles vanished while he typed (fixed).
**Meera:** cannot fix a wrong name without kicking; the panel hid the seats while she worked (fixed); Esc did nothing (fixed); "Could not advance" showed to the room with no next step (fixed); a lost tab has no route back to hosting; the closed room was a dead end (now offers "Host a new game").
**Riley:** 17 players cut six names at 1080p and seven at 720p (fixed); the second row was cut at 720p (fixed); "0 PLAYERS IN" as a saffron headline (now "BE THE FIRST IN" alone); bursts of joins hid the join card for 17 s (now one callout).

## Minor Observations

- Two counters for one number (header now says only "Room open").
- Footer repeated the poster's promise (now "N rounds · Ns per answer").
- Ticker slid in from the right every 10 s (now a crossfade; hidden on short two-row screens).
- Avatar shape drift (seats now rounded squares like the callout and the list).
- The callout mixed Inter 800 with Bebas (now Bebas with the Devanagari fallback).
- Disabled Start pill at 55% put its one line at 3.4:1 (now 82%, the label carries the state).
- "Sound on / Sound off" read as state while the tooltip said the action (now one "Sound" toggle with aria-pressed).
- No cue that real-time has dropped to polling; no "starting soon" ramp before "GET READY".

## Questions to Consider

- Do more people scan or type at real events? That decides whether the QR grows further or the domain and code become the single hero.
- Should the lobby build to a start (a host-armed "STARTING IN 10") so the room looks up before "GET READY"?
- Is rename cheaper than kick-and-rejoin, in the players drawer or on the phone in the lobby?
- Above about 12 players, would a two-column Bebas roster read better from the back than small tiles?
- Should the fact ticker play only at 0 to 1 players, when the screen needs a reason to be watched?
