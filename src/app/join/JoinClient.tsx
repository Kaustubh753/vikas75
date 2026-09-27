'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AvatarId, GameRoom } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';
import CodeInput from '@/components/ui/CodeInput';
import IntroAnimation, { hasSeenIntro } from '@/components/intro/IntroAnimation';
import { AVATAR_NAMES } from '@/lib/avatars';

// Dedicated join screen. Reached from the home "Join a Game" button and from the lobby QR
// code (which deep-links here with ?code=XXXX prefilled). Keeps joining off the landing page.

const INTER = 'var(--font-inter),sans-serif';
const HINDI = 'var(--font-devanagari),var(--font-inter),sans-serif';
const HOUSE_70 = 'rgba(250,248,240,.7)';
const HOUSE_55 = 'rgba(250,248,240,.55)';
const NAME_MAX = 30; // matches the server's sanitizeName cap

const tapeLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: INTER, fontSize: 11, fontWeight: 600,
  letterSpacing: '0.16em', textTransform: 'uppercase', color: HOUSE_70,
};

type Peek =
  | { status: 'idle' }
  | { status: 'checking'; code: string }
  | { status: 'missing'; code: string }
  | { status: 'error'; code: string }
  | { status: 'found'; code: string; count: number; phase: GameRoom['phase']; players: { name: string; avatarId: AvatarId }[] };

// The server's terser errors, in the compère's voice.
function friendlyError(raw: string): string {
  if (/too many requests/i.test(raw)) return 'The room is busy right now. Try again in a moment.';
  if (/busy/i.test(raw)) return 'The room is busy right now. Try again in a moment.';
  if (/not authorized/i.test(raw)) return "That seat belongs to someone else's phone. Try a different name.";
  return raw;
}

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
  const [peek, setPeek] = useState<Peek>({ status: 'idle' });
  const [blockedBy, setBlockedBy] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (retryRef.current) clearTimeout(retryRef.current);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
  }, []);

  // Play the brand intro when arriving from a QR / deep link (a code is prefilled). Manual
  // "Join a Game" from the home page already showed the intro there, so don't replay it.
  const [showIntro, setShowIntro] = useState(() => initialCode.length === 4);
  const dismissIntro = useCallback(() => setShowIntro(false), []);
  // The film plays in full once per device (the landing marks it seen too); after that a QR
  // scan lands straight on the form, because the host and the room are waiting. A returning
  // player on the same phone gets their last name prefilled.
  useEffect(() => {
    if (hasSeenIntro()) setShowIntro(false);
    try {
      const last = localStorage.getItem('vikas75_playerName');
      if (last) setName(last.slice(0, NAME_MAX));
    } catch { /* storage blocked */ }
  }, []);

  useEffect(() => {
    // Focus the name (the first field in reading order) once the intro is out of the way, so
    // the keyboard never rises under the overlay.
    if (showIntro) return;
    const t = setTimeout(() => nameRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, [showIntro]);

  const trimmedCode = code.replace(/\s/g, '');

  // Read the room as soon as the code is complete: a wrong code is caught before Join, a
  // right one turns a blind form into an invitation ("3 players waiting").
  useEffect(() => {
    if (trimmedCode.length !== 4) { setPeek({ status: 'idle' }); return; }
    let cancelled = false;
    setPeek({ status: 'checking', code: trimmedCode });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/game?code=${trimmedCode}`);
        if (cancelled) return;
        if (res.status === 404) { setPeek({ status: 'missing', code: trimmedCode }); return; }
        if (!res.ok) { setPeek({ status: 'error', code: trimmedCode }); return; }
        const data = await res.json();
        const room = data.room as GameRoom;
        const players = Object.values(room.players ?? {}).map((p) => ({ name: p.name, avatarId: p.avatarId }));
        setPeek({ status: 'found', code: trimmedCode, count: players.length, phase: room.phase, players });
      } catch {
        if (!cancelled) setPeek({ status: 'error', code: trimmedCode });
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmedCode]);

  const taken: Partial<Record<AvatarId, string>> = {};
  if (peek.status === 'found') for (const p of peek.players) taken[p.avatarId] = p.name;

  const trimmedName = name.trim();
  const sameName = peek.status === 'found'
    ? peek.players.find((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    : undefined;

  const roomEnded = peek.status === 'found' && peek.phase === 'game-over';
  const roomBusy = peek.status === 'found' && peek.phase === 'submission';
  const nameOk = trimmedName.length > 0;
  const codeOk = trimmedCode.length === 4;
  const canJoin = nameOk && codeOk && peek.status !== 'missing' && !roomEnded && !loading;

  function cancelWaiting() {
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = null;
    setWaiting(false);
    setLoading(false);
  }

  function showBlocked(owner: string) {
    setBlockedBy(owner);
    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    blockedTimerRef.current = setTimeout(() => setBlockedBy(''), 2200);
  }

  // A tap on the not-yet-ready Join button points at what is missing instead of doing nothing.
  function nudge() {
    if (!nameOk) { nameRef.current?.focus(); return; }
    if (!codeOk) {
      const slots = document.querySelectorAll<HTMLInputElement>('.code-slot');
      const empty = [...slots].find((s) => !s.value) ?? slots[0];
      empty?.focus();
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!canJoin) { nudge(); return; }
    setLoading(true); setError('');
    // Stable id across retries so the server treats them as the same joiner.
    const playerId = crypto.randomUUID();

    const attempt = async () => {
      try {
        const res = await fetch('/api/game', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', code: trimmedCode, playerId, playerName: trimmedName, avatarId }),
        });
        const data = await res.json();
        if (res.ok) {
          // If the server reclaimed a disconnected seat with this name, adopt that seat's id
          // so our localStorage identity points at the restored player (score/hand preserved).
          const effectiveId = data.reclaimedPlayerId || playerId;
          localStorage.setItem('vikas75_playerId', effectiveId);
          if (data.token) localStorage.setItem('vikas75_token', data.token); // auth credential
          localStorage.setItem('vikas75_playerName', trimmedName);
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
          router.push(`/room/${trimmedCode}`);
          return;
        }
        // A round is in progress — don't dead-end: wait and auto-retry until it ends.
        if (res.status === 400 && /round is in progress/i.test(data.error || '')) {
          setWaiting(true);
          retryRef.current = setTimeout(attempt, 4000);
          return;
        }
        setError(friendlyError(data.error || 'Could not join the room. Try again.'));
        setLoading(false); setWaiting(false);
      } catch {
        setError('No connection. Check the Wi-Fi and try again.');
        setLoading(false); setWaiting(false);
      }
    };
    await attempt();
  }

  // Two persistent live regions under the code: a polite status for what the room says back,
  // and an alert for what went wrong. A wrong code is the only thing that paints the slots red.
  const codeWrong = peek.status === 'missing' || /not found|no room/i.test(error);
  let statusText = '';
  if (peek.status === 'checking') statusText = 'Checking the code…';
  else if (peek.status === 'error') statusText = "Couldn't check the code, but you can still try to join.";
  else if (peek.status === 'found' && !roomEnded) {
    statusText = `Room ${peek.code} · ${peek.count} ${peek.count === 1 ? 'player' : 'players'} ${peek.phase === 'lobby' ? 'waiting' : 'in the game'}`;
    if (roomBusy) statusText += " · a round is on, you'll join at the next one";
  }
  let alertText = '';
  if (error) alertText = error;
  else if (peek.status === 'missing') alertText = 'No room with this code. Check the big screen.';
  else if (roomEnded) alertText = 'That game has ended. Ask the host to start a new one.';

  const joinLabel = loading
    ? (waiting ? 'Waiting for the round to end…' : 'Joining…')
    : !nameOk ? 'Enter your name to join'
    : !codeOk ? 'Enter the room code'
    : peek.status === 'missing' ? 'No room with this code'
    : roomEnded ? 'That game has ended'
    : 'Join the game';

  const avatarCaption = blockedBy
    ? `That one's ${blockedBy}'s. Pick another.`
    : avatarId === 'a0'
    ? "We'll pick a face for you, or tap one."
    : `You're ${AVATAR_NAMES[avatarId]}.`;

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', width: '100%', background: '#08070f', isolation: 'isolate' }}>
      {showIntro && <IntroAnimation onDone={dismissIntro} />}

      {/* Stage: near-black floor, saffron spotlight, film grain — the same set as every screen */}
      <div style={{ position: 'absolute', inset: 0, background: '#08070f', zIndex: 0 }} />
      <div style={{
        position: 'absolute', left: '50%', top: '-30%', width: '140vw', height: '80vh',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse at center,rgba(255,153,51,.16) 0%,rgba(255,153,51,.06) 28%,rgba(255,153,51,0) 60%)',
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        opacity: 0.12, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 2,
      }} />

      <main
        inert={showIntro}
        style={{
          position: 'relative', zIndex: 3, minHeight: '100dvh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          // Bottom padding clears the fixed Join bar so the last avatar row can scroll above it.
          padding: 'clamp(12px, 2vh, 20px) 16px calc(150px + env(safe-area-inset-bottom))', boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header: a way back that is nowhere near the primary button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button" onClick={() => router.push('/')}
              style={{ background: 'none', border: 'none', color: HOUSE_55, fontFamily: INTER, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em', minHeight: 44, padding: '0 8px 0 0', transition: 'color .15s ease' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = HOUSE_70}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = HOUSE_55}
            >
              ← Home
            </button>
            <span style={{ fontFamily: 'var(--font-yatra),var(--font-bebas),sans-serif', fontSize: 22, color: '#ffffff', lineHeight: 1 }}>Vikas 75</span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: 'var(--font-bebas),sans-serif', fontWeight: 400,
              fontSize: 'clamp(34px, 9vw, 44px)', lineHeight: 1, letterSpacing: '0.08em', color: '#ffffff', margin: 0,
            }}>Join the game</h1>
            <p lang="hi" style={{ fontFamily: HINDI, fontSize: 15, color: HOUSE_70, margin: '6px 0 0', lineHeight: 1.4 }}>खेल में शामिल हों</p>
          </div>

          <form id="join-form" onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Name */}
            <div>
              <label htmlFor="join-name" style={{ ...tapeLabel, marginBottom: 8 }}>Your name</label>
              <input
                id="join-name"
                ref={nameRef}
                style={{
                  height: 52, background: 'rgba(250,248,240,.04)',
                  border: '1.5px solid rgba(250,248,240,.14)', borderRadius: 6,
                  padding: '0 16px', color: '#ffffff',
                  fontFamily: 'var(--font-inter),var(--font-devanagari),sans-serif', fontSize: 16,
                  outline: 'none', width: '100%', boxSizing: 'border-box',
                  transition: 'border-color .12s ease',
                }}
                placeholder="What should the room call you?"
                value={name}
                onChange={e => setName(e.target.value.slice(0, NAME_MAX))}
                maxLength={NAME_MAX} autoComplete="nickname" autoCapitalize="words"
                onFocus={e => (e.target.style.borderColor = '#FF9933')}
                onBlur={e => (e.target.style.borderColor = name ? '#FF9933' : 'rgba(250,248,240,.14)')}
              />
              <p aria-live="polite" style={{ fontFamily: INTER, fontSize: 12, color: sameName ? '#FF9933' : HOUSE_55, margin: '8px 0 0', lineHeight: 1.4 }}>
                {sameName
                  ? `There's already a ${sameName.name} in this room. Add an initial so the big screen tells you apart.`
                  : 'Your name and avatar show on the big screen.'}
              </p>
            </div>

            {/* Room code */}
            <div>
              <span id="join-code-label" style={{ ...tapeLabel, marginBottom: 8, textAlign: 'center' }}>Room code</span>
              <CodeInput
                value={code}
                onChange={(v) => { setCode(v); setError(''); }}
                disabled={loading}
                error={codeWrong}
                labelledBy="join-code-label"
              />
              <p
                role="status"
                aria-live="polite"
                style={{ fontFamily: INTER, fontSize: 13, color: '#85c47d', margin: '10px 0 0', minHeight: alertText ? 0 : 18, lineHeight: 1.4, textAlign: 'center' }}
              >
                {statusText}
              </p>
              <p
                role="alert"
                style={{ fontFamily: INTER, fontSize: 13, color: '#f87171', margin: alertText ? '6px 0 0' : 0, lineHeight: 1.4, textAlign: 'center' }}
              >
                {alertText}
              </p>
            </div>

            {/* Avatar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span id="join-avatar-label" style={tapeLabel}>Pick a face</span>
                <span style={{ fontFamily: INTER, fontSize: 11, color: HOUSE_55, letterSpacing: '0.04em' }}>optional</span>
              </div>
              <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={loading} taken={taken} labelledBy="join-avatar-label" onBlocked={showBlocked} />
              <p aria-live="polite" style={{ fontFamily: INTER, fontSize: 13, color: blockedBy ? '#FF9933' : HOUSE_70, margin: '10px 0 0', lineHeight: 1.4 }}>
                {avatarCaption}
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Fixed Join bar — always reachable, always saffron; the label carries the reason.
          (Fixed rather than sticky: the body's overflow-x guard breaks sticky positioning.) */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 5,
        padding: '18px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(180deg, rgba(8,7,15,0) 0%, #08070f 30%)',
        pointerEvents: 'none',
      }}>
        <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
          <button
            type="submit"
            form="join-form"
            aria-disabled={!canJoin || undefined}
            aria-busy={loading || undefined}
            className="btn-push"
            style={{
              width: '100%', height: 56, padding: '8px 16px',
              background: '#FF9933', color: '#1a1208',
              border: 'none', borderRadius: 12,
              fontFamily: 'var(--font-bebas),sans-serif', fontSize: 22, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: canJoin ? 'pointer' : 'not-allowed',
              opacity: canJoin || loading ? 1 : 0.82,
              boxShadow: canJoin ? undefined : 'none',
            }}
          >
            {joinLabel}
          </button>
          {waiting ? (
            <button
              type="button" onClick={cancelWaiting}
              style={{ background: 'none', border: 'none', color: HOUSE_70, fontFamily: INTER, fontSize: 13, cursor: 'pointer', letterSpacing: '0.04em', minHeight: 36, padding: '0 12px' }}
            >
              Cancel
            </button>
          ) : (
            <p style={{ fontFamily: INTER, fontSize: 12, color: HOUSE_55, margin: 0, lineHeight: 1.4, textAlign: 'center' }}>
              The host starts the game on the big screen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
