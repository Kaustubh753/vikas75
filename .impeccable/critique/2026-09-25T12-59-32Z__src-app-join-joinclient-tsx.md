---
target: join page (src/app/join/JoinClient.tsx)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-25T12-59-32Z
slug: src-app-join-joinclient-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector sub-agent) — second run, after the polish pass

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Room peek, reason-on-label button and avatar caption are excellent; the focused empty slot was pixel-identical to its neighbours |
| 2 | Match System / Real World | 3 | Venue words throughout; "avatar" is the one jargon label; no Hindi on the first UI a walk-up player reads |
| 3 | User Control and Freedom | 3 | Back, Cancel while waiting, editable prefilled code, re-rollable dice, skippable intro |
| 4 | Consistency and Standards | 3 | Dice tile was a second saffron fill; wordmark bare here but a full lockup on the next screen; two greens and two reds |
| 5 | Error Prevention | 3 | I/O excluded, paste extraction, live 404 before Join, taken tiles locked; duplicate names accepted silently |
| 6 | Recognition Rather Than Recall | 4 | Everything visible; taken tiles carry their owner's name; the button names what is missing |
| 7 | Flexibility and Efficiency | 3 | Paste, QR deep link, Enter submits; returning name not prefilled; 17 Tab stops to Join |
| 8 | Aesthetic and Minimalist Design | 3 | The optional grid is five times the area of the required fields |
| 9 | Error Recovery | 3 | Model copy for wrong and ended rooms; every POST failure painted the slots red |
| 10 | Help and Documentation | 2 | No hint of what happens after Join |
| **Total** | | **30/40** | **Good (75%)** |

## Design Specificity Verdict

**LLM assessment:** specific in dress, generic in staging. The stage, the tricolour strip, Yatra One, tape labels, ticket corners, the 56px Bebas Join bar with its lip, and the compère copy make it unmistakably Vikas 75. The composition is still the stock mobile OTP form, and the room code is glass boxes rather than the cream tiles the player is looking at on the projector.

**Deterministic scan:** CLI detector clean on all four source files (0 findings, no suppressions). In-page detector at 375×812: one warning on both paths, cramped-padding on the fixed Join button (declared padding 0 inside a 56px box with 33px of line box), a geometric false positive; padding has since been declared.

**Visual overlays:** injection succeeded on both paths; the [Human] tab was left open at 375×812 with the single badge.

## Overall Impression

The fast path is now genuinely fast and the room talks back within 350 ms. What remained was keyboard and screen-reader craft on the two custom controls, and the size of the optional avatar grid against the two required fields.

## What's Working

- **The room peek.** "Room NECD · 3 players waiting" in green under the slots, taken faces greyed with owner captions, and a wrong code caught before Join.
- **The Join bar.** Fixed in the thumb zone, always saffron, the reason on the label through every state, with Cancel while a round runs.
- **Code-entry engineering.** Share links, WhatsApp messages and lowercase pastes all resolve; clearing a middle letter holds its place; Enter submits.

## Priority Issues

- **[P1] The active code slot was invisible.** Inline outline none and a transparent caret; border saffron only when filled. **Why:** the core interaction on the manual path, and it overrode the global focus ring. **Fix:** saffron border, 8% fill, a 3px inset bar and a saffron caret on the focused slot; the global ring restored. **Suggested command:** /impeccable harden. **Status:** fixed in this session.
- **[P1] The optional avatar grid outweighs the required fields.** Twelve 109px tiles, a 41px wordmark and 103px of dead space beside the slots; at 375×667 the fold shows one row of faces. **Why:** Operate mode; a walk-up stranger needs name and code and out. **Fix:** small lockup, the code as the hero in the projector's cream-tile treatment, the picker collapsed to a row. **Suggested command:** /impeccable distill. **Status:** the wordmark is now a small header and the slots are centred; the grid stays by the owner's decision (the artwork is intentional).
- **[P1] The radiogroup did not work as one, and focus vanished on taken tiles.** All twelve tiles were tab stops, arrows did nothing, taken tiles had outline none, the status node swapped roles, and the disabled Join was unreachable by Tab. **Fix:** roving tab stop with arrow keys, focus ring on every tile, separate persistent status and alert regions, `aria-disabled` on Join. **Suggested command:** /impeccable harden. **Status:** fixed in this session.
- **[P2] Every join failure looked like a wrong code.** Transport and rate-limit errors painted the slots red under the code label. **Fix:** red slots only for a missing room; friendlier copy for busy and network errors. **Suggested command:** /impeccable clarify. **Status:** fixed in this session.
- **[P2] Duplicate names accepted silently, and a name alone can reclaim a stale seat.** **Fix:** an inline hint when the room already has that name; make seat reclaim require the stored token. **Suggested command:** /impeccable harden. **Status:** the hint is in; the server-side reclaim rule is open.

## Persona Red Flags

**Jordan:** nothing said what happens after Join (now: "The host starts the game on the big screen."); "Choose your avatar" was jargon (now "Pick a face"); a tap on a greyed tile said nothing (now answers in the caption).
**Casey:** "← back to home" sat 6px under the primary in the thumb zone (now top-left in the header); the disabled button swallowed taps (now points at the missing field); a returning player retyped their name (now prefilled).
**Sam:** empty slots had no focus indicator; 17 Tab stops; roles flipped on one node; the disabled submit unreachable (all addressed).

## Minor Observations

- Slots were left-aligned with 103px of dead space (now centred).
- Status green #4aa640 and red #f87171 sit beside the system's #85c47d and #ef4444 (green aligned; the red line stays lighter than the slot red by design).
- Partial paste "Room code is NEC" filled R M C D (now N E C).
- The QR path leaves the code editable; a stray Backspace edits a code the player never typed.
- No "You're in" beat on the phone after Join; the projector does the callout.

## Questions to Consider

- On the QR path, does the code need to be four editable slots at all?
- Could the avatar choice move into the lobby, where the player waits anyway?
- Which single Hindi line honours "never English-only in spirit" here? (One is now under the heading.)
- Should a phone that still holds a valid token for this room skip the form and rejoin directly?
- Same-name policy: warn and suggest an initial, auto-suffix, or block?
