'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AvatarId, GameRoom } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';
import CodeInput from '@/components/ui/CodeInput';
import { AVATAR_NAMES } from '@/lib/avatars';
import IntroAnimation from '@/components/intro/IntroAnimation';
import LogoLockup from '@/components/ui/LogoLockup';
import JoinTurnAnimation, { type TurnResult } from '@/components/join/JoinTurnAnimation';
import { HANDOFF_KEY, prefersReducedMotion, type Rect, type TurnHandoff } from '@/components/join/turn-timeline';
import { loadSeat, saveSeat, clearSeat } from '@/lib/seat-storage';

// What the room says back once four valid characters are in, read 350 ms after the last one.
type Peek =
  | { status: 'idle' }
  | { status: 'checking'; code: string }
  | { status: 'missing'; code: string }
  | { status: 'error'; code: string }
  | { status: 'found'; code: string; count: number; phase: GameRoom['phase']; players: { name: string; avatarId: AvatarId }[]; savedName: string };

const INTER = 'var(--font-inter),sans-serif';
const BEBAS = 'var(--font-bebas),sans-serif';
const HOUSE_70 = 'rgba(250,248,240,0.7)';
const HOUSE_55 = 'rgba(250,248,240,0.55)';
const HAIRLINE = 'rgba(250,248,240,0.14)';
const tapeLabel: React.CSSProperties = { fontFamily: INTER, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: HOUSE_55 };

/** How long to wait for the join to be answered before giving the screen back. Comfortably
 *  longer than a slow-but-working request on venue Wi-Fi, short enough that a stalled one
 *  doesn't strand the player behind the animation's overlay. */
const JOIN_TIMEOUT_MS = 8_000;

// Dedicated join screen. Reached from the home "Join a Game" button and from the lobby QR
// code (which deep-links here with ?code=XXXX prefilled). Keeps joining off the landing page.
export default function JoinClient({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  // Prefill the name for a returning player — this room's saved seat first, then whatever
  // name they last played under anywhere. Coming back via the QR then becomes: scan, tap
  // Join, land in your old seat with your score and hand intact.
  useEffect(() => {
    setName((current) => {
      if (current) return current;
      try {
        return loadSeat(initialCode)?.name || localStorage.getItem('vikas75_playerName') || '';
      } catch { return ''; }
    });
  }, [initialCode]);
  const [code, setCode] = useState(initialCode);
  // 'a0' = "auto" — if the player doesn't pick, the server assigns a revolving default
  // so a lobby of players gets distinct avatars instead of all defaulting to the same one.
  const [avatarId, setAvatarId] = useState<AvatarId>('a0');
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false); // a round is in progress — auto-retrying
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (retryRef.current) clearTimeout(retryRef.current); }, []);

  // CodeInput emits a fixed four-slot string (a cleared middle letter never shifts the rest), so
  // the code is judged complete by its letters, not its length.
  const trimmedCode = code.replace(/\s/g, '');

  // Read the room as soon as the code is complete: a wrong code is caught before Join, a right
  // one turns a blind form into an invitation ("Room NECD · 3 players waiting") and tells the
  // picker which faces are already taken.
  const [peek, setPeek] = useState<Peek>({ status: 'idle' });
  useEffect(() => {
    let cancelled = false;
    // The state changes happen inside the timer, never synchronously in the effect body.
    const t = setTimeout(async () => {
      if (trimmedCode.length !== 4) { setPeek({ status: 'idle' }); return; }
      setPeek({ status: 'checking', code: trimmedCode });
      let savedName = '';
      try { savedName = loadSeat(trimmedCode)?.name ?? ''; } catch { /* blocked storage */ }
      try {
        const res = await fetch(`/api/game?code=${trimmedCode}`);
        if (cancelled) return;
        if (res.status === 404) { setPeek({ status: 'missing', code: trimmedCode }); return; }
        if (!res.ok) { setPeek({ status: 'error', code: trimmedCode }); return; }
        const data = await res.json();
        const room = data.room as GameRoom;
        const players = Object.values(room.players ?? {}).map((p) => ({ name: p.name, avatarId: p.avatarId }));
        setPeek({ status: 'found', code: trimmedCode, count: players.length, phase: room.phase, players, savedName });
      } catch {
        if (!cancelled) setPeek({ status: 'error', code: trimmedCode });
      }
    }, trimmedCode.length === 4 ? 350 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmedCode]);
  const taken: Partial<Record<AvatarId, string>> = {};
  if (peek.status === 'found') for (const p of peek.players) taken[p.avatarId] = p.name;
  // A returning player's own saved name is not a clash — that seat is theirs to reclaim.
  const sameName = peek.status === 'found' && !!name.trim()
    && peek.players.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase())
    && peek.savedName.trim().toLowerCase() !== name.trim().toLowerCase();

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
    const slots = [...document.querySelectorAll('.code-slot')] as HTMLElement[];
    const rects = slots.slice(0, 4).map(el => el.getBoundingClientRect());
    if (rects.length !== 4 || rects.some(r => r.width < 1)) return null;
    return rects.map(r => ({ left: r.left, top: r.top, width: r.width, height: r.height }));
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
      else document.querySelector<HTMLInputElement>('.code-slot')?.focus();
    }, 200);
    return () => clearTimeout(t);
  }, [initialCode]);

  const canJoin = !!name.trim() && trimmedCode.length === 4 && !loading && peek.status !== 'missing';

  /** The disabled Join points at what is missing instead of swallowing the tap. */
  function nudge() {
    if (!name.trim()) { nameRef.current?.focus(); return; }
    if (trimmedCode.length !== 4) {
      const slots = document.querySelectorAll<HTMLInputElement>('.code-slot');
      const empty = [...slots].find((s) => !s.value) ?? slots[0];
      empty?.focus();
    }
  }

  function cancelWaiting() {
    if (retryRef.current) clearTimeout(retryRef.current);
    setWaiting(false); setLoading(false); setError('');
  }

  async function handleJoin(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canJoin) { nudge(); return; }
    setLoading(true); setError('');
    // A returning player (same room, same name as this device's saved seat) presents their
    // old playerId + token, so the server's idempotent-rejoin branch hands back their exact
    // seat — score, hand, joinedRound — instantly and in ANY phase, mid-round included. A
    // different name is a deliberate fresh identity, so it gets a brand-new id instead.
    const savedSeat = loadSeat(trimmedCode);
    const returning = !!savedSeat && savedSeat.name.trim().toLowerCase() === name.trim().toLowerCase();
    // Stable id across retries so the server treats them as the same joiner.
    let playerId = returning && savedSeat ? savedSeat.playerId : crypto.randomUUID();
    let joinToken: string | undefined = returning && savedSeat ? savedSeat.token : undefined;
    let retriedFresh = false;

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
      // A hung request must not become a dead end. `fetch` does not reject on a stalled
      // connection — it just never settles — and the turn animation covers the screen with a
      // pointer-events overlay until the server answers, so without this the player is sealed
      // behind "Joining…" with no way back but a browser reload. Venue Wi-Fi does this.
      const ctl = new AbortController();
      const bail = setTimeout(() => ctl.abort(), JOIN_TIMEOUT_MS);
      try {
        const res = await fetch('/api/game', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', code: trimmedCode, playerId, playerName: name.trim(), avatarId, ...(joinToken ? { token: joinToken } : {}) }),
          signal: ctl.signal,
        });
        const data = await res.json();
        if (res.ok) {
          // If the server reclaimed a disconnected seat with this name, adopt that seat's id
          // so our localStorage identity points at the restored player (score/hand preserved).
          const effectiveId = data.reclaimedPlayerId || playerId;
          // Guarded because storage throws on a device that blocks site data, and these writes
          // sit inside the try whose catch reports "Network error. Please try again." The join
          // had already SUCCEEDED server-side at this point, so a throw here left the player
          // never navigating, retrying forever against a misleading error. The reads in
          // PlayerView degrade to the name-based reclaim, so losing these is survivable.
          try {
            localStorage.setItem('vikas75_playerId', effectiveId);
            if (data.token) localStorage.setItem('vikas75_token', data.token); // auth credential
            localStorage.setItem('vikas75_playerName', name.trim());
          } catch { /* blocked storage — the seat record below is attempted too, then we navigate */ }
          // Store the avatar the server actually assigned (the revolving default, or our pick),
          // not the requested value — which may be the 'a0' auto sentinel.
          const assignedAvatar = (data.room?.players?.[effectiveId]?.avatarId as AvatarId) || (avatarId === 'a0' ? 'a1' : avatarId);
          try {
            localStorage.setItem('vikas75_avatarId', assignedAvatar);
            localStorage.setItem('vikas75_roomCode', trimmedCode);
          } catch { /* as above */ }
          // The per-room seat record — the durable credential this device reconnects with.
          saveSeat(trimmedCode, {
            playerId: effectiveId,
            token: (data.token as string) || joinToken || '',
            name: name.trim(),
            avatarId: assignedAvatar,
          });
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
        // Our saved seat credential was rejected (the seat's token has been rotated — e.g. a
        // name-based reclaim from another device reissued it). The record is dead: drop it and
        // retry once as a brand-new joiner; the stale-seat reclaim can still recover the seat.
        if (res.status === 403 && joinToken && !retriedFresh) {
          retriedFresh = true;
          clearSeat(trimmedCode);
          playerId = crypto.randomUUID();
          joinToken = undefined;
          void attempt();
          return;
        }
        if (res.status === 404) clearSeat(trimmedCode); // room is gone — so is the seat
        // "No room called V7KS" — a refused code is named in the game's own terms; anything
        // else the server has to say, it says itself.
        refuse(res.status === 404
          ? `No room called ${trimmedCode}`
          : data.error || 'Could not join room');
      } catch (err) {
        // An abort is our own timeout firing, not a dead network — say which, so a player on a
        // slow-but-alive connection knows retrying is worth it.
        refuse((err as Error)?.name === 'AbortError'
          ? 'Taking too long to reach the game. Please try again.'
          : 'Network error. Please try again.');
      } finally {
        clearTimeout(bail);
      }
    };
    await attempt();
  }

  // A wrong code is the only thing that paints the slots red; every other failure says what
  // went wrong in the alert line so the code the player typed is not accused.
  const codeWrong = peek.status === 'missing' || /no room called/i.test(error);
  let statusText = '';
  if (peek.status === 'checking') statusText = 'Looking for the room…';
  else if (peek.status === 'found') {
    if (peek.phase === 'game-over') statusText = `Room ${peek.code} · that game has ended`;
    else if (peek.phase === 'lobby') statusText = `Room ${peek.code} · ${peek.count} ${peek.count === 1 ? 'player' : 'players'} waiting`;
    else if (peek.phase === 'submission') statusText = `Room ${peek.code} · a round is in progress, you can join when it ends`;
    else statusText = `Room ${peek.code} · ${peek.count} ${peek.count === 1 ? 'player' : 'players'} in the game`;
  }
  const alertText = peek.status === 'missing' ? 'No room with this code. Check the big screen.' : error;
  const ended = peek.status === 'found' && peek.phase === 'game-over';
  const joinLabel = waiting ? 'Waiting for the round to end…'
    : loading ? 'Joining…'
    : peek.status === 'missing' ? 'No room with this code'
    : ended ? 'That game has ended'
    : !name.trim() ? 'Enter your name to join'
    : trimmedCode.length !== 4 ? 'Enter the room code'
    : 'Join the game';

  const showBlocked = (owner: string) => setNote(`That one's ${owner}'s. Pick another.`);

  return (
    <div style={{ minHeight: '100dvh', width: '100%', background: '#08070f', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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

      <main
        inert={showIntro}
        style={{
          width: '100%', maxWidth: 400, boxSizing: 'border-box',
          // Room for the fixed Join bar and its helper line, so the last avatar row scrolls clear.
          padding: 'calc(8px + env(safe-area-inset-top)) 16px calc(150px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 22,
          // The first beat of the turn: the form settles back and blurs, handing the screen to
          // the card. Reversed — more slowly, after a beat — if the card is refused.
          transform: formSettled ? 'translateY(10px)' : 'none',
          opacity: formSettled ? 0 : 1,
          filter: formSettled ? 'blur(3px)' : 'blur(0px)',
          transition: turn || formSettled
            ? ['opacity', 'filter', 'transform']
              .map(p => `${p} ${formSettled ? '620ms' : '700ms'} cubic-bezier(.33,0,.25,1) ${formSettled ? '120ms' : '0ms'}`)
              .join(', ')
            : undefined,
        }}
      >
        {/* Header: the way out sits top-left, never beside the primary where a slipped thumb would lose the form. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          <button
            type="button" onClick={() => router.push('/')}
            style={{ background: 'none', border: 'none', color: HOUSE_55, fontFamily: INTER, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em', padding: '0 4px', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
          >
            ← Home
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <LogoLockup size="md" />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: BEBAS, fontSize: 38, lineHeight: 1, letterSpacing: '0.06em', color: '#fff', margin: 0 }}>Join the game</h1>
            <p lang="hi" style={{ fontFamily: 'var(--font-devanagari),var(--font-inter),sans-serif', fontSize: 15, lineHeight: 1.4, color: HOUSE_70, margin: '6px 0 0' }}>खेल में शामिल हों</p>
          </div>
        </div>

        <form id="join-form" onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Name */}
          <div>
            <label htmlFor="join-name" style={{ ...tapeLabel, display: 'block', marginBottom: 8 }}>Your name</label>
            <input
              id="join-name"
              ref={nameRef}
              style={{
                height: 52, background: 'rgba(250,248,240,.04)',
                border: `1px solid ${HAIRLINE}`, borderRadius: 6,
                padding: '0 16px', color: '#fff',
                fontFamily: INTER, fontSize: 16,
                width: '100%', boxSizing: 'border-box',
                transition: 'border-color .12s ease',
              }}
              placeholder="What should the room call you?"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20} autoComplete="nickname" autoCapitalize="words"
              onFocus={e => (e.target.style.borderColor = '#FF9933')}
              onBlur={e => (e.target.style.borderColor = HAIRLINE)}
            />
            <p style={{ fontFamily: INTER, fontSize: 12, lineHeight: 1.45, color: sameName ? '#FF9933' : HOUSE_55, margin: '6px 0 0' }}>
              {sameName
                ? `Someone in this room is already called ${name.trim()}. Add an initial so the judge can tell you apart.`
                : 'Your name and avatar show on the big screen.'}
            </p>
          </div>

          {/* Room code, with the two live regions under it */}
          <div>
            <span id="join-code-label" style={{ ...tapeLabel, display: 'block', marginBottom: 8, textAlign: 'center' }}>Room code</span>
            <CodeInput value={code} onChange={setCode} disabled={loading} error={codeWrong} labelledBy="join-code-label" />
            <p role="status" aria-live="polite" style={{ fontFamily: INTER, fontSize: 12, fontWeight: 600, color: '#85c47d', textAlign: 'center', margin: '10px 0 0', minHeight: 17 }}>
              {statusText}
            </p>
            <p role="alert" style={{ fontFamily: INTER, fontSize: 13, color: '#f87171', textAlign: 'center', margin: '4px 0 0', minHeight: alertText ? undefined : 0 }}>
              {alertText}
            </p>
          </div>

          {/* Avatar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <span id="join-avatar-label" style={tapeLabel}>Pick a face</span>
              <span style={{ fontFamily: INTER, fontSize: 12, color: note ? '#FF9933' : HOUSE_55 }}>
                {note || (avatarId === 'a0' ? 'Or leave it to the dice.' : `You're ${AVATAR_NAMES[avatarId]}.`)}
              </span>
            </div>
            <AvatarPicker value={avatarId} onChange={(id) => { setAvatarId(id); setNote(''); }} disabled={loading} taken={taken} labelledBy="join-avatar-label" onBlocked={showBlocked} />
          </div>

          {/* Consent notice at the point of data entry (the name field above). */}
          <p style={{ textAlign: 'center', margin: 0, fontFamily: INTER, fontSize: 11, lineHeight: 1.5, color: 'rgba(250,248,240,.45)' }}>
            By joining, you agree to our{' '}
            <a href="/terms" style={{ color: HOUSE_70, textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms</a>
            {' '}and{' '}
            <a href="/privacy" style={{ color: HOUSE_70, textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy Policy</a>.
          </p>
        </form>
      </main>

      {/* The Join bar: fixed in the thumb zone, always saffron, the reason on its label. It is
          aria-disabled rather than disabled so a tap on a not-yet-ready button points at the
          missing field instead of doing nothing. (sticky is defeated by the body's overflow-x guard.) */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
          background: 'linear-gradient(to top, rgba(8,7,15,0.98) 70%, rgba(8,7,15,0))',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          opacity: formSettled ? 0 : 1, transition: 'opacity 300ms ease',
          pointerEvents: formSettled ? 'none' : 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 10 }}>
          <button
            type="submit" form="join-form"
            aria-disabled={!canJoin || undefined}
            aria-busy={loading || undefined}
            className="btn-push"
            style={{
              flex: 1, height: 56, padding: '8px 16px', borderRadius: 6, border: 'none',
              background: '#FF9933', color: '#1a1208', opacity: canJoin || loading ? 1 : 0.82,
              fontFamily: BEBAS, fontSize: 22, letterSpacing: '0.08em', cursor: 'pointer',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {joinLabel}
          </button>
          {waiting && (
            <button type="button" onClick={cancelWaiting} style={{ height: 56, padding: '0 16px', borderRadius: 6, background: 'transparent', border: `1px solid ${HAIRLINE}`, color: HOUSE_70, fontFamily: INTER, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
        <p style={{ fontFamily: INTER, fontSize: 12, color: HOUSE_55, margin: 0 }}>The host starts the game on the big screen.</p>
      </div>
    </div>
  );
}
