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
    channel.bind('game:room-updated', (updated: GameRoom) => {
      setRoom(updated);
    });
    return () => {
      channel.unbind_all();
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
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: rounds, timerDuration: timer }),
      });
    } catch {
      // ignore
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
    <main className="min-h-screen bg-[#0d1b2e] px-4 py-6 pb-24">
      <ConnectionBanner />
      <MuteButton />

      <div className="max-w-lg mx-auto">
        <LogoLockup size="sm" className="mb-4" />

        {/* Room code */}
        <div className="text-center mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
            Room Code
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-7xl tracking-[0.2em] leading-none">
              {code}
            </div>
            <button
              onClick={handleCopyJoinLink}
              title="Copy join link"
              className="text-white/40 hover:text-[#FF9933] transition-colors mt-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>

        {/* QR code */}
        {joinUrl && (
          <div className="flex flex-col items-center mb-4">
            <div className="bg-white p-3 rounded-xl inline-block">
              <QRCodeSVG value={joinUrl} size={120} />
            </div>
            <p className="text-white/40 text-xs mt-2 font-[family-name:var(--font-inter)]">
              {joinUrl}
            </p>
            <button
              onClick={handleShare}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-[family-name:var(--font-inter)] transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share Link
            </button>
          </div>
        )}

        {/* Phase */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">Phase</p>
          <p className="text-white font-[family-name:var(--font-bebas)] text-xl tracking-wide mt-1">
            {PHASE_LABELS[room.phase]}
          </p>
          <p className="text-white/40 text-xs mt-1 font-[family-name:var(--font-inter)]">
            Round {room.round} / {room.totalRounds}
          </p>
        </div>

        {/* Current challenge */}
        {room.currentChallenge && (
          <div className="bg-[#1a3a6e]/60 border border-white/10 rounded-xl px-4 py-3 mb-4">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
              Current Challenge
            </p>
            <p className="text-white text-sm font-[family-name:var(--font-inter)]">
              {room.currentChallenge.icon} {room.currentChallenge.en}
            </p>
          </div>
        )}

        {/* Advance button */}
        {room.phase !== 'judging' && room.phase !== 'game-over' && (
          <motion.button
            onClick={handleAdvance}
            disabled={loading}
            className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 mb-4 animate-pulse-ring"
            whileTap={{ scale: 0.95 }}
          >
            {loading ? 'Working…' : getAdvanceLabel(room)}
          </motion.button>
        )}
        {room.phase === 'game-over' && (
          <motion.button
            onClick={() => router.push('/host/setup')}
            className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 mb-4"
            whileTap={{ scale: 0.95 }}
          >
            New Game
          </motion.button>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center mb-4 animate-shake">{error}</p>
        )}

        {/* Players */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
            Players ({players.length})
          </p>
          <div className="space-y-2">
            {players.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4 font-[family-name:var(--font-inter)]">
                Waiting for players to join…
              </p>
            ) : (
              players.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="rounded-lg overflow-hidden">
                    <Avatar id={p.avatarId} size={36} />
                  </div>
                  <span className="text-white text-sm flex-1 font-[family-name:var(--font-inter)]">
                    {p.name}
                  </span>
                  <span className="text-[#FF9933] text-sm font-bold font-[family-name:var(--font-inter)]">
                    🏆 {p.score}
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
                  onMouseUp={handleUpdateSettings}
                  onTouchEnd={handleUpdateSettings}
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
                  onMouseUp={handleUpdateSettings}
                  onTouchEnd={handleUpdateSettings}
                  className="w-full accent-[#FF9933]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Projector link */}
        {origin && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
              Projector URL
            </p>
            <a
              href={projectorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF9933] text-sm break-all hover:underline font-[family-name:var(--font-inter)]"
            >
              {projectorUrl}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
