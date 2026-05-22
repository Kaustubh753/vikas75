'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import LogoLockup from '@/components/ui/LogoLockup';
import ConnectionBanner from '@/components/ui/ConnectionBanner';
import MuteButton from '@/components/ui/MuteButton';
import Avatar from '@/lib/avatars';
import type { GameRoom, GamePhase } from '@/types/game';

interface Props {
  code: string;
  hostId: string;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  lobby: 'Lobby — Waiting for players',
  'challenge-reveal': 'Challenge Revealed',
  submission: 'Players Submitting',
  reveal: 'Revealing Submissions',
  judging: 'AI Judge Deliberating…',
  winner: 'Winner Announced',
  'between-rounds': 'Between Rounds',
  'game-over': 'Game Over',
};

function getAdvanceLabel(room: GameRoom): string {
  switch (room.phase) {
    case 'lobby': return 'Start Game →';
    case 'challenge-reveal': return 'Open Submissions →';
    case 'submission': return 'End Submissions →';
    case 'reveal': return 'Send to Judge →';
    case 'winner':
      return room.round < room.totalRounds ? 'Next Round →' : 'Final Results →';
    case 'between-rounds': return `Start Round ${room.round + 1} →`;
    case 'game-over': return 'New Game';
    default: return 'Advance →';
  }
}

export default function HostDashboard({ code, hostId }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [rounds, setRounds] = useState(10);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/game?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setRounds(data.room.totalRounds);
        setTimer(data.room.timerDuration);
      }
    } catch {
      // ignore
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    const onRoomUpdated = (updated: GameRoom) => setRoom(updated);
    channel.bind('game:room-updated', onRoomUpdated);
    return () => {
      channel.unbind('game:room-updated', onRoomUpdated);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  // Warn before leaving during an active game
  useEffect(() => {
    if (!room || room.phase === 'lobby' || room.phase === 'game-over') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [room?.phase]);

  async function handleAdvance() {
    if (!room) return;
    // Client-side min-players guard
    if (room.phase === 'lobby' && Object.values(room.players).length < 2) {
      toast.error('Need at least 2 players to start.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', code, hostId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not advance');
      else setRoom(data.room);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleCopyJoinLink() {
    const url = `${origin}/?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Join link copied!');
    } catch {
      toast.error('Could not copy — try manually');
    }
  }

  async function handleShare() {
    const url = `${origin}/?code=${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Vikas 75', text: `Join my Vikas 75 game! Room code: ${code}`, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied!');
    }
  }

  async function handleUpdateSettings() {
    if (!room) return;
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: rounds, timerDuration: timer }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error || 'Could not update settings');
      }
    } catch {
      toast.error('Network error — could not update settings');
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#0d1b2e] flex items-center justify-center">
        <p className="text-white/60 animate-pulse">Loading room…</p>
      </div>
    );
  }

  const players = Object.values(room.players);
  const submittedIds = new Set(Object.keys(room.submissions));
  const projectorUrl = `${origin}/projector/${code}`;
  const joinUrl = origin ? `${origin}/?code=${code}` : '';

  return (
    <main
      className="min-h-screen bg-[#0d1b2e] px-4 py-6 pb-24"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
    >
      <ConnectionBanner />
      <MuteButton />

      <div className="max-w-[680px] mx-auto">
        <LogoLockup size="sm" className="mb-6" />

        {/* PHASE — big indicator at top */}
        <div
          className="rounded-xl p-6 mb-6 text-center"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <p className="text-white/40 uppercase font-[family-name:var(--font-inter)]" style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
            Phase · Round {room.round}/{room.totalRounds}
          </p>
          <p className="text-white font-[family-name:var(--font-bebas)] tracking-wide mt-2" style={{ fontSize: 32, lineHeight: 1 }}>
            {PHASE_LABELS[room.phase]}
          </p>
          {room.currentChallenge && (
            <p className="text-blue-200/90 font-[family-name:var(--font-inter)] mt-3" style={{ fontSize: 14 }}>
              {room.currentChallenge.en}
            </p>
          )}
        </div>

        {/* PRIMARY ACTION — big CTA in the center */}
        {room.phase !== 'judging' && room.phase !== 'game-over' && (
          <motion.button
            onClick={handleAdvance}
            disabled={loading}
            className="w-full disabled:opacity-40 text-white font-[family-name:var(--font-bebas)] tracking-widest rounded-xl transition-all active:scale-95 mb-6 animate-pulse-ring"
            style={{ height: 64, backgroundColor: '#FF9933', fontSize: 28 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? 'Working…' : getAdvanceLabel(room)}
          </motion.button>
        )}
        {room.phase === 'game-over' && (
          <motion.button
            onClick={() => router.push('/host/setup')}
            className="w-full text-white font-[family-name:var(--font-bebas)] tracking-widest rounded-xl transition-all active:scale-95 mb-6"
            style={{ height: 64, backgroundColor: '#FF9933', fontSize: 28 }}
            whileTap={{ scale: 0.95 }}
          >
            New Game
          </motion.button>
        )}

        {/* Invite — collapsible (only matters in lobby) */}
        <details
          className="rounded-xl mb-4 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          open={room.phase === 'lobby'}
        >
          <summary className="cursor-pointer px-6 py-4 flex items-center justify-between text-white font-[family-name:var(--font-inter)]" style={{ fontSize: 14, fontWeight: 600 }}>
            <span>Invite players · Room <span className="text-[#FF9933] font-[family-name:var(--font-bebas)] tracking-[0.15em]" style={{ fontSize: 22 }}>{code}</span></span>
            <span className="text-white/30">▾</span>
          </summary>
          <div className="px-6 pb-6 flex flex-col items-center gap-3 border-t border-white/10 pt-4">
            {joinUrl && (
              <div className="bg-white p-3 rounded-xl inline-block">
                <QRCodeSVG value={joinUrl} size={120} />
              </div>
            )}
            <p className="text-white/50 break-all text-center font-[family-name:var(--font-inter)]" style={{ fontSize: 12 }}>
              {joinUrl}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyJoinLink}
                className="px-4 py-2 rounded-xl border text-white transition-all flex items-center gap-2 font-[family-name:var(--font-inter)]"
                style={{ borderColor: '#FF9933', color: '#FF9933', fontSize: 14, fontWeight: 600 }}
              >
                Copy Link
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 rounded-xl text-white transition-all flex items-center gap-2 font-[family-name:var(--font-inter)]"
                style={{ backgroundColor: '#FF9933', fontSize: 14, fontWeight: 600 }}
              >
                Share
              </button>
            </div>
          </div>
        </details>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4 animate-shake">{error}</p>
        )}

        {/* Players */}
        <div
          className="rounded-xl p-6 mb-4"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <p className="text-white/40 uppercase mb-4 font-[family-name:var(--font-inter)]" style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
            Players ({players.length})
          </p>
          <div className="space-y-2">
            {players.length === 0 ? (
              <p className="text-white/30 text-center py-6 font-[family-name:var(--font-inter)] animate-pulse" style={{ fontSize: 14 }}>
                Waiting for players to join…
              </p>
            ) : (
              players.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="rounded-lg overflow-hidden" style={{ width: 48, height: 48 }}>
                    <Avatar id={p.avatarId} size={48} />
                  </div>
                  <span className="text-white flex-1 font-[family-name:var(--font-inter)]" style={{ fontSize: 14, fontWeight: 600 }}>
                    {p.name}
                  </span>
                  <span className="text-[#FF9933] font-[family-name:var(--font-bebas)]" style={{ fontSize: 20 }}>
                    {p.score}
                  </span>
                  {room.phase === 'submission' && (
                    <span className={submittedIds.has(p.id) ? 'text-green-400 text-lg' : 'text-white/20 text-lg'}>
                      {submittedIds.has(p.id) ? '✓' : '○'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lobby settings */}
        {room.phase === 'lobby' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4 font-[family-name:var(--font-inter)]">
              Settings
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-xs font-[family-name:var(--font-inter)]">Rounds</span>
                  <span className="text-[#FF9933] text-xs font-bold">{rounds}</span>
                </div>
                <input
                  type="range" min={5} max={15} value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  onPointerUp={handleUpdateSettings}
                  className="w-full accent-[#FF9933]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-white/60 text-xs font-[family-name:var(--font-inter)]">Timer</span>
                  <span className="text-[#FF9933] text-xs font-bold">{timer}s</span>
                </div>
                <input
                  type="range" min={30} max={120} step={5} value={timer}
                  onChange={(e) => setTimer(Number(e.target.value))}
                  onPointerUp={handleUpdateSettings}
                  className="w-full accent-[#FF9933]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Projector link — collapsed */}
        {origin && (
          <details
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <summary className="cursor-pointer px-6 py-4 flex items-center justify-between text-white font-[family-name:var(--font-inter)]" style={{ fontSize: 14, fontWeight: 600 }}>
              <span>Projector URL</span>
              <span className="text-white/30">▾</span>
            </summary>
            <div className="px-6 pb-4 border-t border-white/10 pt-3">
              <a
                href={projectorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF9933] break-all hover:underline font-[family-name:var(--font-inter)]"
                style={{ fontSize: 13 }}
              >
                {projectorUrl}
              </a>
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
