/* Shared vocabulary for the "turn" join animation — design direction 2a.
 *
 * The gesture: the four room-code boxes gather into a single card with the code printed on
 * its back, the card turns over once (slowly) to show the player on its face, then it rises
 * and takes its seat in the lobby. Card-game motion — one gesture at a time, nothing snaps.
 *
 * The direction was drawn against a 390-wide mock whose code slot measured 53.6 × 60.6, and
 * every other number in it (the gathered pitch, the card, the travel, the avatar) was placed
 * relative to that slot. The real form is fluid — `clamp()` slot sizes inside a wrapper that
 * scales itself to fit the viewport — so nothing here is a hard pixel value. We measure the
 * live slots at submit time and scale the whole composition by `k = slotWidth / REF_SLOT_W`,
 * which reproduces the design at whatever size the form actually rendered.
 *
 * The animation spans two routes (/join → /room/[code]). The playhead on the join side runs
 * to `T.end`, hands the card's final viewport rect across in sessionStorage, and the room
 * side picks it up at exactly those coordinates so the cut is invisible. */

/** sessionStorage key carrying the card across the route boundary. */
export const HANDOFF_KEY = 'vikas75_join_turn';

/** The lobby marks the joining player's own seat with this attribute and the landing finds
 *  it by query — the only coupling between the two, so the lobby stays free to lay itself
 *  out however it likes. Keep in step with the literal in `PlayerLobby`. */
export const MY_SEAT_ATTR = 'data-vikas-my-seat';

/** A handoff older than this is stale — a back-button return, a refresh, a resumed tab —
 *  and must not replay the landing. Generous enough to cover a slow route transition. */
export const HANDOFF_MAX_AGE = 8_000;

export interface Rect { left: number; top: number; width: number; height: number }

export interface TurnHandoff {
  code: string;
  name: string;
  avatarId: string;
  /** Card's viewport rect at the end of its rise — where the room side must pick it up. */
  card: Rect;
  /** Design-unit scale, so the room side draws the avatar and name at the same size. */
  k: number;
  at: number;
}

/** The design's reference slot. Every REF number below is in these units. */
export const REF_SLOT_W = 53.6;

/** Geometry, in design units. Multiply by `k` for pixels. */
export const REF = {
  /** Gathered pitch — also the width of the boxes printed on the card back, which is why
   *  the gathered slots land exactly on them and the cross-dissolve reads as one object. */
  gatherPitch: 33.2,
  gatherDy: 32,
  gatherScale: 33.2 / 53.6,

  cardW: 168,
  cardH: 236,
  /** Card top, measured from the top of the slot row. */
  cardDy: 2.3,
  cardRadius: 12,
  perspective: 900,

  travelDy: -164,

  // card back (the code, printed)
  backLabelY: 22,
  backLabelSize: 8,
  backBoxX: 17.55,
  backBoxY: 41.2,
  backBoxW: 33.2,
  backBoxH: 37.6,
  backBoxRadius: 3,
  backBoxFont: 15,
  backRuleY: 98,
  backRuleInset: 24,
  backLogoX: 24,
  backLogoBottom: 26,
  backLogoW: 120,
  backLogoH: 27.3,

  // card face (the player)
  avatarX: 36,
  avatarY: 70,
  avatarSize: 96,
  avatarRadius: 16,
  nameY: 174,
  nameSize: 24,

  // the ghost slots themselves
  slotRadius: 5,
  slotFont: 24.2,
} as const;

/** Success timeline, in ms from submit. Lifted beat-for-beat from the direction. */
export const T = {
  /** The form settles back and blurs. Reference only — the form owns this beat as a CSS
   *  transition on its own wrapper (see `JoinClient`), since it never needs a playhead.
   *  Keep the two in step. */
  settle: [120, 740] as const,
  gatherFrom: 420,                      // boxes gather, one after another
  gatherStagger: 40,
  gatherDur: 920,
  /** The hold. The card does not resolve — and above all does not turn — until the server
   *  has answered, so the animation can never outrun the network and promise a room that
   *  isn't there. By the time we reach it the gather is ~85% home, so a normal-latency
   *  answer passes straight through and the designed timing plays untouched. */
  gate: 1180,
  cardIn: [1180, 1700] as const,        // they resolve into a card back
  slotsOut: [1340, 1660] as const,
  flip: [1760, 2700] as const,          // the card turns over, slowly
  travel: [2620, 3440] as const,        // it rises
  backingOut: [2760, 3280] as const,    // the frame dissolves, leaving the player
  end: 3440,
} as const;

/** How long the hold can run before we admit we're waiting and say so. */
export const QUIET_WAIT_AFTER = 1_100;

/** Refusal timeline ("the card won't turn"), in ms from the moment the refusal starts.
 *  No shake and no red flash: the boxes simply come back to where they started and change
 *  colour on the way. */
export const R = {
  /** Don't begin refusing before this point on the master clock — a code rejected in 200ms
   *  should still show the gather "as if to make the card" before it's refused. Until then
   *  the refusal is only *scheduled*; the gather carries on as though nothing is wrong. */
  earliest: 860,
  stall: [0, 900] as const,             // the turn starts and stops
  stallPeak: 0.46,
  stallDeg: 27,
  back: [260, 1160] as const,           // and they go back to their places
  recolour: [420, 640] as const,        // changing colour on the way
  /** The beat where the screen is handed back: the form comes out of its blur and says, in
   *  its own place, what went wrong. Both are the form's to run (a 700ms CSS transition, no
   *  delay) — the refusal only cues them, hence a single instant rather than a span. Keep
   *  the cue and that 700ms in step with `JoinClient`'s restore transition, so the overlay
   *  leaves (`end`) just as the form finishes arriving. */
  restoreCue: 640,
  /** The ghosts dissolve as they arrive, handing the boxes back to the real inputs beneath
   *  — the mirror of the card's cross-dissolve on the way out. */
  ghostsOut: [880, 1200] as const,
  end: 1260,
} as const;

/** Landing timeline on the room side, from the moment the player's seat is on screen. */
export const L = {
  backdrop: [0, 420] as const,          // the lobby resolves underneath
  fly: [0, 540] as const,               // the player takes their seat
  nameOut: [0, 220] as const,
  handOff: [400, 540] as const,         // cross-dissolve into the real seat
  end: 560,
  /** If the seat never appears (a slow room fetch, a redirect), don't hang on it. */
  giveUpAfter: 2_200,
  giveUpFade: 400,
} as const;

/* ── easing ──────────────────────────────────────────────────── */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Solve a CSS cubic-bezier(x1,y1,x2,y2) for y at a given x. Newton's method with a
 *  bisection fallback — the same approach browsers use, accurate enough that the motion
 *  matches the prototype's CSS curves rather than approximating them. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = sampleX(t) - x;
      if (Math.abs(d) < 1e-6) return sampleY(t);
      const s = slopeX(t);
      if (Math.abs(s) < 1e-6) break;
      t -= d / s;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v > x) hi = t; else lo = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

/** The curves the direction actually uses, named for the beat they carry. */
export const EASE = {
  settle: cubicBezier(0.33, 0, 0.25, 1),
  gather: cubicBezier(0.26, 0.6, 0.3, 1),
  flip: cubicBezier(0.5, 0, 0.3, 1),
  travel: cubicBezier(0.3, 0, 0.2, 1),
  stall: cubicBezier(0.42, 0, 0.58, 1),
  back: cubicBezier(0.33, 0, 0.3, 1),
  fly: cubicBezier(0.3, 0, 0.2, 1),
  linear: (t: number) => t,
};

/** Progress of a segment `[start, end]` at time `t`, eased. */
export function seg(t: number, start: number, end: number, ease: (t: number) => number = EASE.linear) {
  if (end <= start) return t >= end ? 1 : 0;
  return ease(clamp01((t - start) / (end - start)));
}

/** The player asked not to be moved around. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
