'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

function TimerBar({ total, remaining }: { total: number; remaining: number }) {
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div className="relative h-2 bg-white/10">
        <motion.div
          className="absolute left-0 top-0 h-full w-full origin-left"
          style={{ backgroundColor: urgent ? '#ef4444' : '#FF9933', transformOrigin: '0 50%' }}
          animate={{
            scaleX: frac,
            boxShadow: urgent ? '0 0 14px 4px rgba(239,68,68,0.7)' : 'none',
          }}
          transition={{ duration: 0.8, ease: 'linear' }}
        />
      </div>
      <div className={`absolute right-6 font-[family-name:var(--font-bebas)] text-4xl leading-none ${urgent ? 'text-red-400 animate-pulse' : 'text-white/60'}`} style={{ top: 10 }}>
        {remaining}
      </div>
    </div>
  );
}

function StaticTimerBar({ total }: { total: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div className="h-2 bg-[#FF9933]" />
      <div className="absolute right-6 font-[family-name:var(--font-bebas)] text-4xl leading-none text-white/60" style={{ top: 10 }}>
        {total}
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
    <div className="w-full h-full bg-[#1a0d2e] flex items-center justify-center relative overflow-hidden">
      {room.timerEndsAt
        ? <TimerBar total={room.timerDuration} remaining={remaining} />
        : <StaticTimerBar total={room.timerDuration} />
      }

      <div
        className="animate-slam-in bg-[#1a3a6e] rounded-3xl shadow-2xl border border-white/10 flex flex-col items-center text-center"
        style={{ minWidth: 640, maxWidth: 760, padding: '48px 64px' }}
      >
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
