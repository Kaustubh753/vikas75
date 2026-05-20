'use client';

import { useEffect, useState } from 'react';
import { getPusherClient, getRoomChannel } from '@/lib/pusher';
import type { GameRoom, Player } from '@/types/game';
import Button from '@/components/ui/Button';

export default function HostPanel({ code }: { code: string }) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hostId, setHostId] = useState('');

  useEffect(() => {
    setHostId(sessionStorage.getItem('vikas75_playerId') ?? '');
  }, []);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then(({ room, error }) => {
        if (error) setError(error);
        else setRoom(room);
      });

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:room-updated', (data: GameRoom) => setRoom(data));
    channel.bind('game:phase-changed', ({ room }: { room: GameRoom }) => setRoom(room));
    channel.bind('game:verdict', ({ room }: { room: GameRoom }) => setRoom(room));
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  async function advance() {
    if (!room || !hostId) return;
    setBusy(true);
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'advance', code, hostId }),
    });
    setBusy(false);
  }

  if (error) return (
    <div className="min-h-screen bg-[#1a3a6e] flex items-center justify-center">
      <p className="text-red-300 text-lg">{error}</p>
    </div>
  );
  if (!room) return (
    <div className="min-h-screen bg-[#1a3a6e] flex items-center justify-center">
      <p className="text-[#8aa8cc] animate-pulse">Loading room…</p>
    </div>
  );

  const players = Object.values(room.players);
  const leaderboard = [...players].sort((a: Player, b: Player) => b.score - a.score);
  const submittedCount = Object.keys(room.submissions).length;
  const projectorUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/projector/${code}`;
  const isAdvanceable = room.phase !== 'judging' && room.phase !== 'game-over';

  return (
    <div className="min-h-screen bg-[#1a3a6e] text-white p-6 flex flex-col gap-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl uppercase tracking-widest">
          Host Controls
        </h1>
        <span className="text-[#FFD700] font-bold text-2xl tracking-[0.2em]">{code}</span>
      </div>

      {/* Projector link */}
      <div className="bg-white/10 rounded-xl p-4">
        <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-1">Projector / TV</p>
        <a href={projectorUrl} target="_blank" rel="noreferrer" className="text-[#FFD700] underline text-sm break-all">
          {projectorUrl}
        </a>
        <p className="text-[#8aa8cc] text-xs mt-1">Open this on your laptop / TV browser</p>
      </div>

      {/* Phase + progress */}
      <div className="bg-white/10 rounded-xl p-4 space-y-1">
        <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Phase</p>
        <p className="text-white font-bold text-xl capitalize">{room.phase.replace(/-/g, ' ')}</p>
        <p className="text-[#8aa8cc] text-sm">
          Round {room.round} / {room.totalRounds} &nbsp;·&nbsp;
          {players.length} player{players.length !== 1 ? 's' : ''}
          {room.phase === 'submission' && ` · ${submittedCount}/${players.length} submitted`}
        </p>
      </div>

      {/* Advance button */}
      <Button
        onClick={advance}
        disabled={busy || !isAdvanceable}
        fullWidth
        className="text-lg py-4"
      >
        {busy ? 'Working…' : advanceLabel(room.phase, room.round, room.totalRounds)}
      </Button>

      {room.phase === 'judging' && (
        <p className="text-[#8aa8cc] text-sm text-center animate-pulse">
          AI Judge is deliberating… verdict will come automatically
        </p>
      )}

      {/* Player list in lobby */}
      {room.phase === 'lobby' && (
        <div>
          <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-3">Players Joined</p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <span key={p.id} className="bg-white/10 px-3 py-1 rounded-full text-sm">
                {p.name}
              </span>
            ))}
            {players.length === 0 && (
              <p className="text-[#8aa8cc] text-sm">Waiting for players to join…</p>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard (after first round) */}
      {room.round > 0 && leaderboard.length > 0 && (
        <div>
          <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-3">Leaderboard</p>
          <div className="space-y-2">
            {leaderboard.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2">
                <span className="text-[#8aa8cc] w-5 text-sm">{i + 1}</span>
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="text-[#FFD700] font-bold">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function advanceLabel(phase: string, round: number, total: number): string {
  switch (phase) {
    case 'lobby':          return 'Start Game →';
    case 'challenge-reveal': return 'Open Submissions →';
    case 'submission':     return 'End Submissions & Reveal →';
    case 'reveal':         return 'Send to AI Judge →';
    case 'winner':         return round >= total ? 'Final Leaderboard →' : 'Next Round →';
    case 'between-rounds': return 'Start Next Round →';
    default:               return 'Advance →';
  }
}
