'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

function TimerRing({ total, remaining }: { total: number; remaining: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className={`relative w-28 h-28 ${urgent ? 'animate-pulse-ring' : ''}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={urgent ? '#ef4444' : '#FF9933'}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-[family-name:var(--font-bebas)] text-3xl ${urgent ? 'text-red-400' : 'text-white'}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

export default function ProjectorChallengeReveal({ room }: Props) {
  const challenge = room.currentChallenge;
  const [remaining, setRemaining] = useState(room.timerDuration);

  useEffect(() => {
    getMusicManager().play('challenge');
  }, []);

  useEffect(() => {
    if (!room.timerEndsAt) return;
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((room.timerEndsAt! - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [room.timerEndsAt]);

  if (!challenge) return null;

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
      {/* Timer ring top-right */}
      {room.timerEndsAt && (
        <div className="absolute top-8 right-8 z-20">
          <TimerRing total={room.timerDuration} remaining={remaining} />
        </div>
      )}

      {/* Card animates in from top */}
      <div
        className="animate-slam-in bg-[#1a3a6e] rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center text-center"
        style={{ minWidth: 640, maxWidth: 760, padding: '48px 64px' }}
      >
        {/* Tricolour top bar */}
        <div className="w-full flex h-2 rounded-full overflow-hidden mb-8">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        <p className="text-white/50 text-xs uppercase tracking-[0.4em] font-[family-name:var(--font-inter)] mb-6">
          Problem Statement
        </p>

        <h2
          className="font-[family-name:var(--font-bebas)] text-white leading-tight tracking-wide mb-6"
          style={{ fontSize: '52px' }}
        >
          {challenge.en}
        </h2>

        <p
          className="font-[family-name:var(--font-devanagari)] text-blue-200 leading-relaxed"
          style={{ fontSize: '28px' }}
        >
          {challenge.hi}
        </p>

        <div className="w-full flex h-2 rounded-full overflow-hidden mt-8 mb-4">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>
        <p className="text-white/30 text-xs uppercase tracking-[0.4em] font-[family-name:var(--font-inter)]">
          Vikas 75
        </p>
      </div>
    </div>
  );
}
