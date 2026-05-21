'use client';

import { useEffect, useState, useMemo } from 'react';
import { getPusherClient, getRoomChannel, onConnectionStateChange, type PusherConnectionState } from '@/lib/pusher-client';
import type { GameRoom, Player, GameMode } from '@/types/game';

interface Props {
  code: string;
  hostId: string;
}

export default function HostPanel({ code, hostId }: Props) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loadError, setLoadError] = useState('');
  const [advanceError, setAdvanceError] = useState('');
  const [busy, setBusy] = useState(false);
  // Settings state (synced from room)
  const [rounds, setRounds] = useState(5);
  const [timer, setTimer] = useState(90);
  const [gameMode, setGameMode] = useState<GameMode>('crowd');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [connState, setConnState] = useState<PusherConnectionState>('connecting');
  const [projectorUrl, setProjectorUrl] = useState('');

  // Must be declared before any early returns to satisfy rules of hooks
  const players = useMemo(() => (room ? Object.values(room.players) : []), [room]);
  const leaderboard = useMemo(() => [...players].sort((a: Player, b: Player) => b.score - a.score), [players]);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then(({ room, error }) => {
        if (error) setLoadError(error);
        else {
          setRoom(room);
          setRounds(room.totalRounds ?? 5);
          setTimer(room.timerDuration ?? 90);
          setGameMode(room.gameMode ?? 'crowd');
        }
      });

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:room-updated', (data: GameRoom) => setRoom(data));
    const cleanupConn = onConnectionStateChange(setConnState);
    setProjectorUrl(`${window.location.origin}/projector/${code}`);
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
      cleanupConn();
    };
  }, [code]);

  async function advance() {
    if (!room) return;
    setBusy(true);
    setAdvanceError('');
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'advance', code, hostId }),
    });
    const data = await res.json();
    if (data.error) setAdvanceError(data.error);
    setBusy(false);
  }

  async function saveSettings() {
    setBusy(true);
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: rounds, timerDuration: timer, gameMode }),
    });
    const data = await res.json();
    if (!data.error) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    }
    setBusy(false);
  }

  if (loadError) return (
    <div className="min-h-screen bg-[#1a3a6e] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-red-300 text-lg mb-3">{loadError}</p>
        <a href="/" className="text-[#FFD700] underline text-sm">← Back to home</a>
      </div>
    </div>
  );

  if (!room) return (
    <div className="min-h-screen bg-[#1a3a6e] flex items-center justify-center">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="h-3 w-3 rounded-full bg-[#FFD700] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  const submittedCount = Object.keys(room.submissions).length;
  const isJudging = room.phase === 'judging';
  const isOver = room.phase === 'game-over';

  const isDisconnected = connState === 'unavailable' || connState === 'failed' || connState === 'disconnected';
  const isReconnecting = connState === 'connecting';

  return (
    <div className="min-h-screen bg-[#1a3a6e] text-white flex flex-col">
      {(isDisconnected || isReconnecting) && (
        <div className="bg-yellow-500 text-[#1a3a6e] text-xs font-bold text-center py-2 px-4">
          {isDisconnected ? '⚠ Connection lost — player updates paused' : '↻ Reconnecting…'}
        </div>
      )}
      <div className="h-1 bg-[#FF9933]" />
      <div className="flex-1 p-5 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Host Controls</p>
            <h1 className="font-[family-name:var(--font-oswald)] text-2xl uppercase tracking-widest text-white">Vikas 75</h1>
          </div>
          <div className="text-right">
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Room</p>
            <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-3xl tracking-[0.3em] font-bold">{code}</p>
          </div>
        </div>

        {/* Projector link */}
        <div className="bg-white/10 rounded-xl p-3 border border-white/5">
          <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-1">Projector / TV — open on big screen</p>
          <a href={projectorUrl} target="_blank" rel="noreferrer" className="text-[#FFD700] text-sm underline break-all">
            {projectorUrl}
          </a>
        </div>

        {/* Game settings (lobby only) */}
        {room.phase === 'lobby' && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/5 space-y-4">
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Game Settings</p>

            {/* Rounds */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-white/70">Rounds</span>
                <span className="text-[#FFD700] font-bold text-sm font-[family-name:var(--font-oswald)]">{rounds}</span>
              </div>
              <input
                type="range" min={5} max={30} step={1} value={rounds}
                onChange={e => setRounds(Number(e.target.value))}
                className="w-full accent-[#FF9933]"
              />
              <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
                <span>5</span><span>30</span>
              </div>
            </div>

            {/* Timer */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-white/70">Timer per round</span>
                <span className="text-[#FFD700] font-bold text-sm font-[family-name:var(--font-oswald)]">{timer}s</span>
              </div>
              <input
                type="range" min={30} max={120} step={10} value={timer}
                onChange={e => setTimer(Number(e.target.value))}
                className="w-full accent-[#FF9933]"
              />
              <div className="flex justify-between text-[9px] text-white/30 mt-0.5">
                <span>30s</span><span>120s</span>
              </div>
            </div>

            {/* Game mode */}
            <div>
              <p className="text-xs text-white/70 mb-2">Game Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {(['crowd', 'friends'] as GameMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setGameMode(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                      gameMode === m
                        ? 'bg-[#FF9933] text-[#1a3a6e]'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {m === 'crowd' ? '📺 Crowd Mode' : '📱 Friends Mode'}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/40 mt-1.5">
                {gameMode === 'crowd'
                  ? 'Challenge shown on projector only'
                  : 'Challenge shown on everyone\'s phone'}
              </p>
            </div>

            <button
              onClick={saveSettings}
              disabled={busy}
              className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition-all disabled:opacity-40"
            >
              {settingsSaved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* Phase status */}
        <div className="bg-white/10 rounded-xl p-4 border border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-1">Phase</p>
              <p className="font-[family-name:var(--font-oswald)] text-white text-xl uppercase tracking-wide capitalize">
                {room.phase.replace(/-/g, ' ')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-1">Round</p>
              <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-xl">
                {room.round} / {room.totalRounds}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-[#8aa8cc]">
            <span>{players.length} player{players.length !== 1 ? 's' : ''}</span>
            {room.phase === 'submission' && (
              <span className="text-[#FF9933]">{submittedCount}/{players.length} submitted</span>
            )}
          </div>
          {room.currentChallenge && room.phase !== 'lobby' && (
            <div className="mt-3 bg-white/5 rounded-lg px-3 py-2">
              <p className="text-[#8aa8cc] text-[9px] uppercase tracking-wide mb-0.5">Current Challenge</p>
              <p className="text-white text-xs">{room.currentChallenge.en}</p>
            </div>
          )}
        </div>

        {/* Advance button */}
        {!isOver && (
          <button
            onClick={advance}
            disabled={busy || isJudging}
            aria-label={isJudging ? 'AI Judge is deliberating' : advanceLabel(room.phase, room.round, room.totalRounds)}
            aria-busy={busy}
            className="w-full py-4 rounded-xl font-[family-name:var(--font-oswald)] text-xl uppercase tracking-widest transition-all bg-[#FF9933] text-[#1a3a6e] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ffaa55] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50"
          >
            {busy ? 'Working…' : isJudging ? 'AI Judge deliberating…' : advanceLabel(room.phase, room.round, room.totalRounds)}
          </button>
        )}

        {advanceError && (
          <p className="text-red-300 text-sm text-center bg-red-900/30 rounded-lg px-4 py-2">{advanceError}</p>
        )}

        {/* Player list (lobby) */}
        {room.phase === 'lobby' && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/5">
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-3">Players joined ({players.length}/15)</p>
            {players.length === 0 ? (
              <p className="text-[#8aa8cc] text-sm animate-pulse">Waiting for players to join…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <span key={p.id} className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-sm text-white">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        {room.round > 0 && (
          <div>
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest mb-2">Leaderboard</p>
            <div className="space-y-2">
              {leaderboard.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 border border-white/5">
                  <span className="text-[#8aa8cc] w-4 text-xs">{i + 1}</span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-lg font-bold">{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function advanceLabel(phase: string, round: number, total: number): string {
  switch (phase) {
    case 'lobby':            return 'Start Game →';
    case 'challenge-reveal': return 'Open Submissions →';
    case 'submission':       return 'End Submissions →';
    case 'reveal':           return 'Send to AI Judge →';
    case 'winner':           return round >= total ? 'Final Leaderboard →' : 'Next Round →';
    case 'between-rounds':   return 'Start Next Round →';
    default:                 return 'Advance →';
  }
}
