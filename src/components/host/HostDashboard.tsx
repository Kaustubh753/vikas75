'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
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

  async function handleAdvance() {
    if (!room) return;
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
          <div className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-7xl tracking-[0.2em] leading-none">
            {code}
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
          <button
            onClick={handleAdvance}
            disabled={loading}
            className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 mb-4 animate-pulse-ring"
          >
            {loading ? 'Working…' : getAdvanceLabel(room)}
          </button>
        )}
        {room.phase === 'game-over' && (
          <button
            onClick={() => router.push('/host/setup')}
            className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 mb-4"
          >
            New Game
          </button>
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
