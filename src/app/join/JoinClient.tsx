'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AvatarId } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';
import IntroAnimation from '@/components/intro/IntroAnimation';
import LogoLockup from '@/components/ui/LogoLockup';
import JoinTurnAnimation, { type TurnResult } from '@/components/join/JoinTurnAnimation';
import { HANDOFF_KEY, prefersReducedMotion, type Rect, type TurnHandoff } from '@/components/join/turn-timeline';

/** Smallest the join form is allowed to shrink to. Past this it stops scaling and the page is
 *  allowed to scroll instead — a form too small to read is worse than a short scroll. */
const FIT_FLOOR = 0.62;

// Dedicated join screen. Reached from the home "Join a Game" button and from the lobby QR
// code (which deep-links here with ?code=XXXX prefilled). Keeps joining off the landing page.
export default function JoinClient({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode);
  // 'a0' = "auto" — if the player doesn't pick, the server assigns a revolving default
  // so a lobby of players gets distinct avatars instead of all defaulting to the same one.
  const [avatarId, setAvatarId] = useState<AvatarId>('a0');
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false); // a round is in progress — auto-retrying
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // Fit the whole form — logo, name, all nine avatars, code boxes, button — into whatever screen
  // the player is on, rather than making them scroll to find the join button. Measures the form's
  // natural height against the viewport and scales down only as far as it needs to.
  const fitRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const fit = () => {
      const natural = el.offsetHeight;              // transform doesn't change this
      if (!natural) return;
      const pad = window.innerWidth < 420 ? 24 : 96; // matches the container's vertical padding
      const avail = window.innerHeight - pad;
      setFitScale(Math.max(FIT_FLOOR, Math.min(1, avail / natural)));
    };
    fit();
    // Re-fit when the content changes height (an error appears, the avatar grid reflows) and when
    // the viewport does (rotation, the mobile URL bar collapsing).
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); window.removeEventListener('orientationchange', fit); };
  }, []);
  const slotsRef = useRef<(HTMLInputElement | null)[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (retryRef.current) clearTimeout(retryRef.current); }, []);

  // ── The turn (design direction 2a) ──────────────────────────────────────────────
  // On submit the four code boxes gather into a card, it turns over to show the player, and
  // it rises into the lobby. The gesture starts with the request rather than after it, so
  // the network cost is spent inside the animation; the turn itself is gated on the answer,
  // so a refused code gets the refusal instead of a card. See `turn-timeline.ts`.
  const [turn, setTurn] = useState<{ slots: Rect[]; code: string; name: string } | null>(null);
  const [turnResult, setTurnResult] = useState<TurnResult>('pending');
  /** The form settles back and blurs while the card is in play, and comes back into focus if
   *  the card is refused. A CSS transition, so it costs nothing per frame. */
  const [formSettled, setFormSettled] = useState(false);
  // The avatar the server actually assigned — the requested value may be the 'a0' auto
  // sentinel, which has no artwork. Resolved well before the card turns to show it.
  const [cardAvatar, setCardAvatar] = useState<AvatarId>('a1');
  const turnActiveRef = useRef(false);
  const turnRouteRef = useRef<string | null>(null);
  const pendingErrorRef = useRef<string | null>(null);

  /** Live viewport rects of the four code inputs — the animation is built off these, so it
   *  fits whatever size the form actually rendered at. */
  function measureSlots(): Rect[] | null {
    const rects = [0, 1, 2, 3].map(i => slotsRef.current[i]?.getBoundingClientRect());
    if (rects.some(r => !r || r.width < 1)) return null;
    return rects.map(r => ({ left: r!.left, top: r!.top, width: r!.width, height: r!.height }));
  }

  const handleTurnSuccess = useCallback((h: Omit<TurnHandoff, 'at'> | null) => {
    // Hand the card's exact rect to the room route so it can pick it up mid-air. If that
    // fails the player still gets to their room — they just arrive without the landing.
    if (h) {
      try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...h, at: Date.now() })); } catch { /* optional */ }
    }
    if (turnRouteRef.current) router.push(turnRouteRef.current);
  }, [router]);

  // The refusal's cue: the form comes out of its blur and, in its own place, says what went
  // wrong — both as one movement, so the words arrive with the screen rather than after it.
  const restoreForm = useCallback(() => {
    setFormSettled(false);
    const msg = pendingErrorRef.current;
    if (msg !== null) {
      setError(msg);
      setLoading(false);
      setWaiting(false);
    }
  }, []);

  const handleTurnRefused = useCallback(() => {
    turnActiveRef.current = false;
    pendingErrorRef.current = null;
    setTurn(null);
    setFormSettled(false);
  }, []);
  // Play the brand intro when arriving from a QR / deep link (a code is prefilled). Manual
  // "Join a Game" from the home page already showed the intro there, so don't replay it.
  const [showIntro, setShowIntro] = useState(() => initialCode.length === 4);
  const dismissIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    // Focus name if we already have a code (came from QR), otherwise focus the code.
    const t = setTimeout(() => {
      if (initialCode.length === 4) nameRef.current?.focus();
      else slotsRef.current[0]?.focus();
    }, 200);
    return () => clearTimeout(t);
  }, [initialCode]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.replace(/\s/g, '');
    if (!name.trim() || trimmedCode.length !== 4) return;
    setLoading(true); setError('');
    // Stable id across retries so the server treats them as the same joiner.
    const playerId = crypto.randomUUID();

    // Deal the card. Only on the first attempt — an auto-retry while a round finishes is a
    // quiet wait, not a fresh gesture — and never when the player asked not to be moved.
    const slots = measureSlots();
    if (slots && !prefersReducedMotion()) {
      turnActiveRef.current = true;
      turnRouteRef.current = null;
      pendingErrorRef.current = null;
      setCardAvatar(avatarId === 'a0' ? 'a1' : avatarId);
      setTurnResult('pending');
      setTurn({ slots, code: trimmedCode, name: name.trim() });
      setFormSettled(true);
    }

    /** Refuse: hand the reason to the animation if it's playing, so the words arrive on the
     *  beat where the screen comes back. Otherwise say it plainly, straight away. */
    const refuse = (msg: string) => {
      if (turnActiveRef.current) {
        pendingErrorRef.current = msg;
        setTurnResult('error');
        return;
      }
      setError(msg); setLoading(false); setWaiting(false);
    };

    const attempt = async () => {
      try {
        const res = await fetch('/api/game', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', code: trimmedCode, playerId, playerName: name.trim(), avatarId }),
        });
        const data = await res.json();
        if (res.ok) {
          // If the server reclaimed a disconnected seat with this name, adopt that seat's id
          // so our localStorage identity points at the restored player (score/hand preserved).
          const effectiveId = data.reclaimedPlayerId || playerId;
          localStorage.setItem('vikas75_playerId', effectiveId);
          if (data.token) localStorage.setItem('vikas75_token', data.token); // auth credential
          localStorage.setItem('vikas75_playerName', name.trim());
          // Store the avatar the server actually assigned (the revolving default, or our pick),
          // not the requested value — which may be the 'a0' auto sentinel.
          const assignedAvatar = (data.room?.players?.[effectiveId]?.avatarId as AvatarId) || (avatarId === 'a0' ? 'a1' : avatarId);
          localStorage.setItem('vikas75_avatarId', assignedAvatar);
          localStorage.setItem('vikas75_roomCode', trimmedCode);
          try {
            const myHand = data.room?.players?.[effectiveId]?.hand;
            if (Array.isArray(myHand) && myHand.length) {
              localStorage.setItem(`vikas75_hand_${trimmedCode}`, JSON.stringify(myHand));
            }
          } catch { /* ignore */ }
          const dest = `/room/${trimmedCode}`;
          if (turnActiveRef.current) {
            // Let the card turn and rise; it navigates when it reaches the top.
            setCardAvatar(assignedAvatar);
            turnRouteRef.current = dest;
            setTurnResult('ok');
          } else {
            router.push(dest);
          }
          return;
        }
        // A round is in progress — don't dead-end: wait and auto-retry until it ends. The
        // card can't wait that long, so it hands off to the quiet wait state instead.
        if (res.status === 400 && /round is in progress/i.test(data.error || '')) {
          setWaiting(true);
          if (turnActiveRef.current) setTurnResult('wait');
          retryRef.current = setTimeout(attempt, 4000);
          return;
        }
        // "No room called V7KS" — a refused code is named in the game's own terms; anything
        // else the server has to say, it says itself.
        refuse(res.status === 404
          ? `No room called ${trimmedCode}`
          : data.error || 'Could not join room');
      } catch {
        refuse('Network error. Please try again.');
      }
    };
    await attempt();
  }

  const baseSlot: React.CSSProperties = {
    width: 'clamp(48px, 14vw, 60px)', height: 'clamp(56px, 16vw, 68px)',
    background: 'rgba(250,248,240,.04)',
    border: '1px solid rgba(250,248,240,.14)',
    borderRadius: 6, color: '#fff',
    fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 6vw, 28px)',
    textAlign: 'center', textTransform: 'uppercase', outline: 'none',
    transition: 'border-color .12s ease',
  };

  return (
    <div style={{
      height: '100dvh', width: '100%',
      background: '#08070f',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(12px, 4vw, 48px) 20px', boxSizing: 'border-box',
      // Scaled to fit, so nothing should scroll — unless the screen is so short that `fit` bottoms
      // out at its floor, in which case scrolling is the honest fallback.
      overflowY: fitScale > FIT_FLOOR ? 'hidden' : 'auto',
    }}>
      {showIntro && <IntroAnimation onDone={dismissIntro} />}
      {turn && (
        <JoinTurnAnimation
          code={turn.code}
          name={turn.name}
          avatarId={cardAvatar}
          slots={turn.slots}
          result={turnResult}
          onRestoreForm={restoreForm}
          onSuccess={handleTurnSuccess}
          onRefused={handleTurnRefused}
        />
      )}
      <div
        ref={fitRef}
        style={{
          width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 24,
          // A transform is visual only: the element keeps its natural layout height, which is
          // exactly what `fit` measures, and the inputs keep their real 16px font size so iOS
          // still doesn't zoom on focus.
          transform: `scale(${fitScale})${formSettled ? ' translateY(10px)' : ''}`,
          transformOrigin: 'center center',
          // The first beat of the turn: the form settles back and blurs, handing the screen
          // to the card. Reversed — more slowly, after a beat — if the card is refused.
          opacity: formSettled ? 0 : 1,
          filter: formSettled ? 'blur(3px)' : 'blur(0px)',
          // Going: a beat, then it settles back over 620ms. Coming back: no delay — the
          // refusal cues this at the exact beat the screen is meant to return, so waiting
          // again here would just leave the player looking at nothing.
          transition: turn || formSettled
            ? ['opacity', 'filter', 'transform']
              .map(p => `${p} ${formSettled ? '620ms' : '700ms'} cubic-bezier(.33,0,.25,1) ${formSettled ? '120ms' : '0ms'}`)
              .join(', ')
            : undefined,
        }}
      >

        {/* Heading */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LogoLockup fluid />
        </div>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Name */}
          <input
            ref={nameRef}
            style={{
              height: 50, background: 'rgba(250,248,240,.04)',
              border: '1px solid rgba(250,248,240,.14)', borderRadius: 6,
              padding: '0 16px', color: '#fff',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 16,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              transition: 'border-color .12s ease',
            }}
            placeholder="Your name"
            aria-label="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20} autoComplete="off"
            onFocus={e => (e.target.style.borderColor = '#FF9933')}
            onBlur={e => (e.target.style.borderColor = 'rgba(250,248,240,.14)')}
          />

          {/* Room code OTP slots */}
          <div>
            <label style={{
              display: 'block', marginBottom: 8,
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 11,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,248,240,.5)',
            }}>Room code</label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {[0, 1, 2, 3].map(i => (
                <input
                  key={i}
                  ref={el => { slotsRef.current[i] = el; }}
                  style={{ ...baseSlot, borderColor: code[i] ? '#FF9933' : 'rgba(250,248,240,.14)' }}
                  value={code[i] ?? ''}
                  maxLength={1} inputMode="text"
                  aria-label={`Room code character ${i + 1}`}
                  onPaste={e => {
                    // Pasting a shared 4-char code (WhatsApp/SMS) should fill all boxes, not one.
                    e.preventDefault();
                    const chars = e.clipboardData.getData('text').toUpperCase()
                      .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 4);
                    if (!chars) return;
                    setCode(chars);
                    slotsRef.current[Math.min(chars.length, 3)]?.focus();
                  }}
                  onChange={e => {
                    // Exclude I and O — generateRoomCode never produces them (too similar to 1/0)
                    const ch = e.target.value.slice(-1).toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '');
                    const arr = [code[0] ?? '', code[1] ?? '', code[2] ?? '', code[3] ?? ''];
                    arr[i] = ch;
                    setCode(arr.join(''));
                    if (ch) slotsRef.current[i + 1]?.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !code[i] && i > 0) slotsRef.current[i - 1]?.focus();
                  }}
                  onFocus={e => (e.target.style.borderColor = '#FF9933')}
                  onBlur={e => (e.target.style.borderColor = code[i] ? '#FF9933' : 'rgba(250,248,240,.14)')}
                />
              ))}
            </div>
          </div>

          <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={loading} />

          {/* The refusal's words. They fade rather than snap in, so a rejected code arrives as
              part of the screen coming back rather than as a jolt. */}
          {error && (
            <div
              className="animate-fade-in"
              style={{ color: '#f87171', fontSize: 13, fontFamily: 'var(--font-inter),sans-serif' }}
            >{error}</div>
          )}
          {waiting && <div style={{ color: '#FF9933', fontSize: 13, fontFamily: 'var(--font-inter),sans-serif' }}>A round is in progress — you&apos;ll join automatically when it ends…</div>}

          <button
            type="submit"
            disabled={loading || !name.trim() || code.length !== 4}
            style={{
              height: 52, padding: '0 18px',
              background: '#FF9933', color: '#1a1208',
              border: '1.5px solid #FF9933', borderRadius: 6,
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600,
              fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer', opacity: (loading || !name.trim() || code.length !== 4) ? 0.45 : 1,
              transition: 'opacity .15s ease',
            }}
          >
            {waiting ? 'Waiting for round…' : loading ? 'Joining…' : 'Join'}
          </button>

          <button
            type="button" onClick={() => router.push('/')}
            style={{
              background: 'none', border: 'none', color: 'rgba(250,248,240,.55)',
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 13,
              cursor: 'pointer', letterSpacing: '0.04em', padding: 4,
              transition: 'color .15s ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(250,248,240,.85)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(250,248,240,.55)'}
          >
            ← back to home
          </button>
        </form>
      </div>
    </div>
  );
}
