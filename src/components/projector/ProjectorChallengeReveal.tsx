'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';
import { getChallengeCardImage, BLUR_NAVY } from '@/lib/cards';

interface Props { room: GameRoom }

function TimerBar({ total, remaining }: { total: number; remaining: number }) {
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-8 bg-white/10 overflow-hidden">
      <motion.div
        className="absolute left-0 top-0 h-full w-full"
        style={{ backgroundColor: urgent ? '#ef4444' : '#FF9933', transformOrigin: '0 50%' }}
        animate={{
          scaleX: frac,
          boxShadow: urgent ? '0 0 16px 6px rgba(239,68,68,0.7)' : 'none',
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center font-[family-name:var(--font-inter)] font-bold text-white ${urgent ? 'animate-pulse' : ''}`}
        style={{ fontSize: 14, zIndex: 1 }}
      >
        {remaining}s
      </span>
    </div>
  );
}

function StaticTimerBar({ total }: { total: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-8 overflow-hidden" style={{ backgroundColor: '#FF9933' }}>
      <span
        className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-inter)] font-bold text-white"
        style={{ fontSize: 14 }}
      >
        {total}s
      </span>
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
        className="animate-slam-in flex gap-12 items-center"
        style={{ maxWidth: 960 }}
      >
        {/* Physical card image — large, centered, drop shadow */}
        <div
          className="relative flex-shrink-0 rounded-3xl overflow-hidden"
          style={{
            width: 420,
            aspectRatio: '2.5 / 3.5',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,153,51,0.3)',
          }}
        >
          <Image
            src={getChallengeCardImage(challenge.id)}
            alt={challenge.en}
            fill
            className="object-cover"
            priority
            placeholder="blur"
            blurDataURL={BLUR_NAVY}
          />
        </div>

        {/* Text alongside */}
        <div className="flex flex-col text-left" style={{ maxWidth: 460 }}>
          <p className="text-white/50 text-xs uppercase tracking-[0.4em] font-[family-name:var(--font-inter)] mb-5">
            Problem Statement
          </p>
          <h2
            className="font-[family-name:var(--font-bebas)] text-white leading-tight tracking-wide mb-5"
            style={{ fontSize: '52px' }}
          >
            {challenge.en}
          </h2>
          <p
            className="font-[family-name:var(--font-devanagari)] text-blue-200 leading-relaxed"
            style={{ fontSize: '26px' }}
          >
            {challenge.hi}
          </p>
          <div className="flex h-1.5 rounded-full overflow-hidden mt-8" style={{ width: 120 }}>
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>
        </div>
      </div>
    </div>
  );
}
