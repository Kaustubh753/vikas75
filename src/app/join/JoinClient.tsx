'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AvatarId } from '@/types/game';
import AvatarPicker from '@/components/ui/AvatarPicker';

// Dedicated join screen. Reached from the home "Join a Game" button and from the lobby QR
// code (which deep-links here with ?code=XXXX prefilled). Keeps joining off the landing page.
export default function JoinClient({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode);
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false); // a round is in progress — auto-retrying
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef<(HTMLInputElement | null)[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (retryRef.current) clearTimeout(retryRef.current); }, []);

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
          localStorage.setItem('vikas75_playerName', name.trim());
          localStorage.setItem('vikas75_avatarId', avatarId);
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
        setError(data.error || 'Could not join room');
        setLoading(false); setWaiting(false);
      } catch {
        setError('Network error. Please try again.');
        setLoading(false); setWaiting(false);
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
      minHeight: '100dvh', width: '100%',
      background: '#07101f',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(20px, 6vw, 48px) 20px', boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-yatra),var(--font-bebas),sans-serif', fontWeight: 400,
            fontSize: 'clamp(36px, 11vw, 56px)', lineHeight: 0.95, color: '#fff', margin: 0,
          }}>Vikas 75</h1>
          <p style={{
            fontFamily: 'var(--font-inter),sans-serif', fontSize: 14, color: '#FF9933',
            marginTop: 8, letterSpacing: '0.02em',
          }}>Join the game</p>
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

          {error && <div style={{ color: '#f87171', fontSize: 13, fontFamily: 'var(--font-inter),sans-serif' }}>{error}</div>}
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
