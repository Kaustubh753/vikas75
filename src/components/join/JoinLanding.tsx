'use client';
/* Direction 2a — "The turn". The lobby half of the animation.
 *
 * The join route hands this component the card's exact viewport rect at the top of its rise,
 * so it can pick the player up mid-air with no visible cut. From there the lobby resolves
 * underneath and the player takes their seat: the avatar flies to its seat card, its corners
 * round off into the seat's circle, and it cross-dissolves into the real thing.
 *
 * Everything is measured, nothing is assumed — the seat is found by attribute at runtime, so
 * the lobby stays free to lay itself out however it likes. If the seat never turns up (a slow
 * room fetch, a redirect back to /join) the overlay just fades and gets out of the way. */
import { useEffect, useState } from 'react';
import {
  HANDOFF_KEY, HANDOFF_MAX_AGE, MY_SEAT_ATTR, REF, L, EASE, seg, lerp,
  type Rect, type TurnHandoff,
} from './turn-timeline';

export default function JoinLanding({ code }: { code: string }) {
  const [handoff, setHandoff] = useState<TurnHandoff | null>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  const [t, setT] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [gone, setGone] = useState(false);

  // Claim the handoff exactly once. Removing it up front means a refresh, a back-button
  // return or a second mount can never replay the landing.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(HANDOFF_KEY);
      if (raw) sessionStorage.removeItem(HANDOFF_KEY);
    } catch { return; }
    if (!raw) return;
    try {
      const h = JSON.parse(raw) as TurnHandoff;
      if (h.code?.toUpperCase() !== code.toUpperCase()) return;
      if (!h.card || Date.now() - h.at > HANDOFF_MAX_AGE) return;
      setHandoff(h);
    } catch { /* malformed — no landing, no harm */ }
  }, [code]);

  // Watch for the seat. It arrives whenever the room payload does, which is why the card
  // holds rather than playing to a position that isn't on screen yet.
  useEffect(() => {
    if (!handoff || target || gaveUp) return;
    let raf = 0;
    const since = performance.now();
    const look = (ts: number) => {
      const el = document.querySelector(`[${MY_SEAT_ATTR}]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) { setTarget({ left: r.left, top: r.top, width: r.width, height: r.height }); return; }
      }
      if (ts - since >= L.giveUpAfter) { setGaveUp(true); return; }
      raf = requestAnimationFrame(look);
    };
    raf = requestAnimationFrame(look);
    return () => cancelAnimationFrame(raf);
  }, [handoff, target, gaveUp]);

  // The landing clock only starts once there's somewhere to land (or we've given up).
  useEffect(() => {
    if (!handoff || (!target && !gaveUp)) return;
    let raf = 0;
    const start = performance.now();
    const finish = gaveUp ? L.giveUpFade : L.end;
    const step = (ts: number) => {
      const now = ts - start;
      setT(now);
      if (now >= finish) { setGone(true); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [handoff, target, gaveUp]);

  if (!handoff || gone) return null;

  const { card, k, avatarId, name } = handoff;
  const u = (v: number) => v * k;

  const started = !!target || gaveUp;
  const avatarSize = u(REF.avatarSize);
  const startLeft = card.left + u(REF.avatarX);
  const startTop = card.top + u(REF.avatarY);

  // Giving up is a plain exit — no flight, just clear the screen.
  if (gaveUp) {
    const out = 1 - seg(t, 0, L.giveUpFade);
    return (
      <Overlay backdrop={out}>
        <Player
          left={startLeft} top={startTop} size={avatarSize}
          radius={u(REF.avatarRadius)} opacity={out} avatarId={avatarId}
        />
        <Name
          left={card.left} width={card.width} top={card.top + u(REF.nameY)}
          size={u(REF.nameSize)} opacity={out} text={name}
        />
      </Overlay>
    );
  }

  const flyP = started ? seg(t, L.fly[0], L.fly[1], EASE.fly) : 0;
  const backdrop = started ? 1 - seg(t, L.backdrop[0], L.backdrop[1]) : 1;
  const nameOp = started ? 1 - seg(t, L.nameOut[0], L.nameOut[1]) : 1;
  const handOff = started ? seg(t, L.handOff[0], L.handOff[1]) : 0;

  const dx = target ? lerp(0, target.left - startLeft, flyP) : 0;
  const dy = target ? lerp(0, target.top - startTop, flyP) : 0;
  const sc = target ? lerp(1, target.width / avatarSize, flyP) : 1;
  // Lands as the seat's circle: at full scale, `size/2` reads as a perfect round.
  const radius = lerp(u(REF.avatarRadius), avatarSize / 2, flyP);

  return (
    <Overlay backdrop={backdrop}>
      <Player
        left={startLeft} top={startTop} size={avatarSize}
        radius={radius} opacity={1 - handOff} avatarId={avatarId}
        transform={`translate(${dx}px, ${dy}px) scale(${sc})`}
      />
      <Name
        left={card.left} width={card.width} top={card.top + u(REF.nameY)}
        size={u(REF.nameSize)} opacity={nameOp} text={name}
      />
    </Overlay>
  );
}

function Overlay({ backdrop, children }: { backdrop: number; children: React.ReactNode }) {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}>
      {/* The join screen ended on flat ink; this is the same ink, lifting to let the lobby
          resolve underneath the card rather than cutting to it. */}
      <div style={{ position: 'absolute', inset: 0, background: '#08070f', opacity: backdrop }} />
      {children}
    </div>
  );
}

function Player({ left, top, size, radius, opacity, avatarId, transform }: {
  left: number; top: number; size: number; radius: number;
  opacity: number; avatarId: string; transform?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/avatars/${avatarId}.webp`} alt=""
      style={{
        position: 'absolute', left, top, width: size, height: size,
        borderRadius: radius, opacity, transform, transformOrigin: 'top left',
        display: 'block',
      }}
    />
  );
}

function Name({ left, width, top, size, opacity, text }: {
  left: number; width: number; top: number; size: number; opacity: number; text: string;
}) {
  return (
    <div style={{
      position: 'absolute', left, width, top, textAlign: 'center',
      fontFamily: 'var(--font-bebas),Impact,sans-serif',
      fontSize: size, lineHeight: `${size}px`, color: '#fff',
      letterSpacing: '0.04em', opacity,
    }}>{text}</div>
  );
}
