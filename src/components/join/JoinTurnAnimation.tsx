'use client';
/* Direction 2a — "The turn". The join half of the animation.
 *
 * Plays over the join form as a fixed overlay: the form settles back and blurs, the four
 * code boxes gather into a single card with the code printed on its back, the card turns
 * over once and the player is on the face, then it rises. At that point the card's viewport
 * rect is handed to the room route, which lands it on the player's seat.
 *
 * The turn is gated on the server's answer (see `T.gate`): a refused code never gets a card,
 * it gets the refusal — the gather stalls part-way and the boxes go back to their places,
 * changing colour on the way. No shake, no red flash. */
import { useEffect, useRef, useState } from 'react';
import {
  REF, REF_SLOT_W, T, R, EASE, QUIET_WAIT_AFTER,
  seg, lerp, clamp01, type Rect, type TurnHandoff,
} from './turn-timeline';

const SAFFRON = '#FF9933';
const REFUSED = '#f87171';
const SLOT_FILL = 'rgba(250,248,240,.04)';
const CARD_BG = '#0d0c16';

/** What the server said. `wait` is the "a round is in progress" path — refused for now, but
 *  not an error, so the boxes go back without turning red and nothing is spelled out. */
export type TurnResult = 'pending' | 'ok' | 'error' | 'wait';

interface Props {
  code: string;
  name: string;
  avatarId: string;
  /** Viewport rects of the four live code inputs, measured at submit. */
  slots: Rect[];
  result: TurnResult;
  /** Fired once, at the beat where a refused card gives the screen back. The form owns both
   *  its un-blurring and its own words, so this is a cue rather than a command. */
  onRestoreForm: () => void;
  /** Null means the geometry wasn't ready — navigate anyway, just without the landing. */
  onSuccess: (handoff: Omit<TurnHandoff, 'at'> | null) => void;
  onRefused: () => void;
}

export default function JoinTurnAnimation({
  code, name, avatarId, slots, result, onRestoreForm, onSuccess, onRefused,
}: Props) {
  const [t, setT] = useState(0);
  /** When the refusal is *due* to begin on the master clock — set the moment the server says
   *  no, but never earlier than `R.earliest`, so the gather plays out first. Null while the
   *  card is still in play. */
  const [refusalAt, setRefusalAt] = useState<number | null>(null);

  const raf = useRef(0);
  const startRef = useRef(0);
  const lastRef = useRef(0);
  const resultRef = useRef<TurnResult>(result);
  const refusalRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  /** The card's resting rect at the top of its rise, kept current for the clock to read
   *  without capturing a stale closure. Null only before the first commit. */
  const handoffRef = useRef<Omit<TurnHandoff, 'at'> | null>(null);

  // The loop reads the result off a ref so a mid-flight answer takes effect on the very next
  // frame without restarting the clock.
  useEffect(() => { resultRef.current = result; }, [result]);

  // Warm the face artwork while the card is still showing its back, so the turn never
  // reveals a blank square on a cold cache.
  useEffect(() => {
    const im = new Image();
    im.src = `/avatars/${avatarId}.webp`;
  }, [avatarId]);

  /* ── geometry, derived from the live slots ─────────────────── */
  const slotW = slots[0]?.width || REF_SLOT_W;
  const slotH = slots[0]?.height || slotW * 1.13;
  const k = slotW / REF_SLOT_W;
  const u = (v: number) => v * k;

  const rowCx = slots.length === 4 ? (slots[0].left + slots[3].left + slots[3].width) / 2 : 0;
  const rowTop = slots[0]?.top ?? 0;

  const cardW = u(REF.cardW);
  const cardH = u(REF.cardH);
  const cardLeft = rowCx - cardW / 2;
  const cardTop = rowTop + u(REF.cardDy);

  /** Where slot `i` ends up once gathered: exactly onto the box printed on the card's back,
   *  which is what lets the cross-dissolve read as one object rather than two. */
  const gatheredCentre = (i: number) => ({
    x: rowCx + (i - 1.5) * u(REF.gatherPitch),
    y: rowTop + slotH / 2 + u(REF.gatherDy),
  });

  /** Gather progress for slot `i` at `time` — staggered, so they go one after another. */
  const gatherAt = (i: number, time: number) => {
    const from = T.gatherFrom + i * T.gatherStagger;
    return seg(time, from, from + T.gatherDur, EASE.gather);
  };

  /** Where the card comes to rest at the top of its rise — the coordinates the lobby half
   *  picks it up at. Deterministic, so it can be handed over the moment the rise ends. */
  const handoff: Omit<TurnHandoff, 'at'> = {
    code, name, avatarId, k,
    card: { left: cardLeft, top: cardTop + u(REF.travelDy), width: cardW, height: cardH },
  };
  useEffect(() => { handoffRef.current = handoff; });

  /* ── the clock ─────────────────────────────────────────────── */
  useEffect(() => {
    const step = (ts: number) => {
      if (!startRef.current) { startRef.current = ts; lastRef.current = ts; }
      const dt = ts - lastRef.current;
      lastRef.current = ts;

      // The hold. Pushing the origin forward (rather than accumulating deltas) keeps the
      // playhead wall-clock accurate on both sides of it.
      if (resultRef.current === 'pending' && ts - startRef.current >= T.gate) startRef.current += dt;

      const now = ts - startRef.current;
      if (refusalRef.current === null && (resultRef.current === 'error' || resultRef.current === 'wait')) {
        // A code refused in 200ms still gets to show the gather "as if to make the card".
        refusalRef.current = Math.max(now, R.earliest);
        setRefusalAt(refusalRef.current);
      }
      setT(now);

      const refusing = refusalRef.current !== null;
      const done = refusing ? now - refusalRef.current! >= R.end : now >= T.end;
      if (done) {
        if (!firedRef.current) {
          firedRef.current = true;
          if (refusing) onRefused();
          else onSuccess(handoffRef.current);
        }
        // Park on the last frame rather than looping over a static image. On success the
        // route change unmounts us, and the room side picks the card up at these exact
        // coordinates — the parked frame is what covers the cut.
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // Mount-only on purpose: the loop is self-contained and reads live values off refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── playhead ──────────────────────────────────────────────── */
  // Scheduled is not started: until the clock reaches `refusalAt` the gather carries on
  // exactly as it would have, and only then does the turn stall.
  const refusing = refusalAt !== null && t >= refusalAt;
  const rt = refusing ? t - refusalAt : 0;

  const backP = refusing ? seg(rt, R.back[0], R.back[1], EASE.back) : 0;
  const stallDeg = refusing ? stallAt(clamp01((rt - R.stall[0]) / (R.stall[1] - R.stall[0]))) : 0;
  const refusedColour = refusing && result === 'error' ? seg(rt, R.recolour[0], R.recolour[1]) : 0;
  const ghostsGone = refusing ? seg(rt, R.ghostsOut[0], R.ghostsOut[1]) : 0;

  // A scheduled refusal must never let the card start to resolve, even in the beats before
  // the refusal actually begins — the whole point of the gate is that a refused code is
  // never promised a card.
  const doomed = refusalAt !== null;
  const cardIn = doomed ? 0 : seg(t, T.cardIn[0], T.cardIn[1]);
  const slotsOut = refusing ? 0 : seg(t, T.slotsOut[0], T.slotsOut[1]);
  const flipP = refusing ? 0 : seg(t, T.flip[0], T.flip[1], EASE.flip);
  const riseP = refusing ? 0 : seg(t, T.travel[0], T.travel[1], EASE.travel);
  const backingOut = refusing ? 0 : seg(t, T.backingOut[0], T.backingOut[1]);

  // The quiet wait state. If the hold runs long the gesture is over, so the waiting becomes
  // words rather than a card sitting there looking stuck.
  const waiting = !refusing && result === 'pending' && t - T.gate >= QUIET_WAIT_AFTER;

  // The card has been refused; give the screen back. Cueing once (rather than driving the
  // form frame by frame) keeps the settle where it belongs — on the form's own transition.
  const restoreDue = refusalAt !== null && t >= refusalAt + R.restoreCue;
  useEffect(() => {
    if (restoreDue) onRestoreForm();
  }, [restoreDue, onRestoreForm]);

  if (slots.length !== 4) return null;

  const chars = [0, 1, 2, 3].map(i => code[i] ?? '');

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        // Locks the screen for the length of the gesture, which also makes a second submit
        // impossible while the card is in the air.
        pointerEvents: 'auto',
      }}
    >
      {/* the four code boxes — gathering, or refusing and going back */}
      <div style={{
        position: 'absolute', inset: 0, perspective: u(700),
        opacity: (1 - slotsOut) * (1 - ghostsGone),
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          transform: `rotateY(${stallDeg}deg)`, transformStyle: 'preserve-3d',
        }}>
          {chars.map((ch, i) => {
            const g = refusing ? gatherAt(i, refusalAt) * (1 - backP) : gatherAt(i, t);
            const home = { x: slots[i].left + slots[i].width / 2, y: slots[i].top + slots[i].height / 2 };
            const to = gatheredCentre(i);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: slots[i].left, top: slots[i].top,
                  width: slots[i].width, height: slots[i].height,
                  boxSizing: 'border-box',
                  border: `1px solid ${mixColour(SAFFRON, REFUSED, refusedColour)}`,
                  borderRadius: u(REF.slotRadius),
                  background: SLOT_FILL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-inter),sans-serif',
                  fontSize: u(REF.slotFont), fontWeight: 600, color: '#fff',
                  transform: `translate(${lerp(0, to.x - home.x, g)}px, ${lerp(0, to.y - home.y, g)}px)`
                    + ` scale(${lerp(1, REF.gatherScale, g)})`,
                }}
              >
                {ch}
              </div>
            );
          })}
        </div>
      </div>

      {/* the card itself */}
      {cardIn > 0 && (
        <div
          style={{
            position: 'absolute',
            left: cardLeft, top: cardTop, width: cardW, height: cardH,
            transform: `translateY(${u(REF.travelDy) * riseP}px)`,
            perspective: u(REF.perspective),
            opacity: cardIn,
          }}
        >
          <div style={{
            position: 'absolute', inset: 0,
            transformStyle: 'preserve-3d', transform: `rotateY(${180 * flipP}deg)`,
          }}>

            {/* back — the code, printed */}
            <div
              style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                borderRadius: u(REF.cardRadius), background: CARD_BG,
                border: '1px solid rgba(255,153,51,.5)',
                boxShadow: `0 ${u(18)}px ${u(44)}px rgba(0,0,0,.55)`,
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', left: 0, right: 0, top: u(REF.backLabelY), textAlign: 'center',
                fontFamily: 'var(--font-inter),sans-serif', fontSize: u(REF.backLabelSize),
                letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(255,153,51,.7)',
              }}>Room</div>
              {chars.map((ch, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: u(REF.backBoxX + i * REF.backBoxW), top: u(REF.backBoxY),
                  width: u(REF.backBoxW), height: u(REF.backBoxH), boxSizing: 'border-box',
                  border: '1px solid rgba(255,153,51,.75)', borderRadius: u(REF.backBoxRadius),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-inter),sans-serif', fontSize: u(REF.backBoxFont),
                  fontWeight: 600, color: '#fff',
                }}>{ch}</div>
              ))}
              <div style={{
                position: 'absolute', left: u(REF.backRuleInset), right: u(REF.backRuleInset),
                top: u(REF.backRuleY), height: 1, background: 'rgba(255,153,51,.28)',
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/intro/logo_mid_cream.webp" alt=""
                style={{
                  position: 'absolute', left: u(REF.backLogoX), bottom: u(REF.backLogoBottom),
                  width: u(REF.backLogoW), height: u(REF.backLogoH), opacity: 0.22,
                }}
              />
            </div>

            {/* face — the player */}
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            }}>
              {/* the frame dissolves on the rise, leaving just the player */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: u(REF.cardRadius), background: CARD_BG,
                border: '1px solid rgba(255,153,51,.5)',
                boxShadow: `0 ${u(18)}px ${u(44)}px rgba(0,0,0,.55)`,
                opacity: 1 - backingOut,
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/avatars/${avatarId}.webp`} alt=""
                style={{
                  position: 'absolute', left: u(REF.avatarX), top: u(REF.avatarY),
                  width: u(REF.avatarSize), height: u(REF.avatarSize),
                  borderRadius: u(REF.avatarRadius), display: 'block',
                }}
              />
              <div style={{
                position: 'absolute', left: 0, right: 0, top: u(REF.nameY), textAlign: 'center',
                fontFamily: 'var(--font-bebas),Impact,sans-serif',
                fontSize: u(REF.nameSize), lineHeight: `${u(REF.nameSize)}px`,
                color: '#fff', letterSpacing: '0.04em',
              }}>{name}</div>
            </div>

          </div>
        </div>
      )}

      {waiting && (
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: rowTop + slotH + u(56), textAlign: 'center',
          fontFamily: 'var(--font-inter),sans-serif', fontSize: u(11),
          letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,248,240,.45)',
        }}>Joining…</div>
      )}
    </div>
  );
}

/** The stall: the turn starts, reaches `stallDeg`, and stops. */
function stallAt(p: number) {
  if (p >= 1) return 0;
  const leg = p <= R.stallPeak ? p / R.stallPeak : 1 - (p - R.stallPeak) / (1 - R.stallPeak);
  return R.stallDeg * EASE.stall(leg);
}

/** Blend two hex colours — the boxes change colour on the way back, they don't flash. */
function mixColour(from: string, to: string, p: number) {
  if (p <= 0) return from;
  if (p >= 1) return to;
  const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = hex(from), b = hex(to);
  const out = a.map((v, i) => Math.round(lerp(v, b[i], p)));
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}
