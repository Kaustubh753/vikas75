'use client';

import { useEffect, useState } from 'react';
import type { GameRoom } from '@/types/game';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';

interface Props { room: GameRoom }

export default function ProjectorSubmission({ room: initial }: Props) {
  const [room, setRoom] = useState(initial);
  const [seconds, setSeconds] = useState(90);

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(getRoomChannel(room.code));
    ch.bind('game:room-updated', setRoom);
    return () => { ch.unbind_all(); pusher.unsubscribe(getRoomChannel(room.code)); };
  }, [room.code]);

  useEffect(() => {
    const tick = () => {
      if (!room.timerEndsAt) return;
      setSeconds(Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [room.timerEndsAt]);

  const players = Object.values(room.players);
  const submitted = Object.keys(room.submissions);
  const fraction = players.length > 0 ? submitted.length / players.length : 0;
  const timerPct = room.timerEndsAt ? Math.max(0, seconds / 90) : 1;
  const timerColor = timerPct > 0.4 ? '#FF9933' : timerPct > 0.15 ? '#FFD700' : '#ef4444';

  return (
    <div
      className="h-screen w-screen bg-[#1a3a6e] flex overflow-hidden relative"
      style={{ backgroundImage: 'radial-gradient(#ffffff07 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex z-10">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Challenge side (left 55%) */}
      <div className="flex flex-col justify-center px-10 pt-10 pb-8" style={{ width: '55%' }}>
        <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-xs mb-6">
          Round {room.round} · Submit your scheme
        </p>

        {room.currentChallenge && (
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1e4080 0%, #0f2347 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="h-0.5 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
            <div className="px-10 py-8 text-center">
              <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-[10px] mb-5">Problem Statement</p>
              <p
                className="font-[family-name:var(--font-oswald)] text-white font-bold uppercase leading-snug mb-5"
                style={{ fontSize: 'clamp(1.4rem, 2.4vw, 2rem)' }}
              >
                {room.currentChallenge.en}
              </p>
              <div className="w-12 h-px bg-[#FF9933]/30 mx-auto mb-5" />
              <p
                className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0]"
                style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.2rem)' }}
              >
                {room.currentChallenge.hi}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tracker side (right 45%) */}
      <div className="flex flex-col justify-center px-8 pt-10 pb-8 border-l border-white/5" style={{ width: '45%' }}>
        {/* Timer */}
        <div className="text-center mb-8">
          <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-xs mb-2">Time Left</p>
          <p
            className="font-[family-name:var(--font-oswald)] font-bold leading-none transition-colors"
            style={{ fontSize: '5rem', color: timerColor }}
          >
            {seconds}
          </p>
          <p className="text-[#8aa8cc] text-xs mt-1">seconds</p>
          {/* Timer bar */}
          <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${timerPct * 100}%`, background: timerColor }}
            />
          </div>
        </div>

        {/* Submission progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-xs">Submissions</p>
            <p className="font-[family-name:var(--font-oswald)] text-white text-2xl">
              <span style={{ color: timerColor }}>{submitted.length}</span>
              <span className="text-white/40 text-lg"> / {players.length}</span>
            </p>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-[#138808]"
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>

        {/* Player checklist */}
        <div className="space-y-2 overflow-y-auto max-h-64">
          {players.map(p => {
            const done = submitted.includes(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                  done ? 'bg-[#138808]/20 border border-[#138808]/30' : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-[#138808]' : 'bg-white/20'}`} />
                <span className={`flex-1 text-base ${done ? 'text-white' : 'text-white/40'}`}>{p.name}</span>
                {done && <span className="text-[#138808] text-sm">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Branding corner */}
      <div className="absolute bottom-4 left-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
