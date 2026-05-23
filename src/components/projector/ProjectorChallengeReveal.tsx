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

function AwaitingSubmissionBanner() {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-8 bg-white/10 flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
      <span className="font-[family-name:var(--font-inter)] text-white/60 font-medium"
            style={{ fontSize: 13, letterSpacing: '0.06em' }}>
        SUBMISSIONS OPEN WHEN HOST ADVANCES
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
    }, 1000);
    return () => clearInterval(tick);
  }, [room.timerEndsAt]);

  if (!challenge) return null;

  // Card at 65vh tall — dramatic and large
  // Width = 65vh × (413/554) ≈ 48.4vh
  const cardStyle: React.CSSProperties = {
    height: '65vh',
    width: 'calc(65vh * 413 / 554)',
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,153,51,0.4)',
    flexShrink: 0,
  };

  return (
    <div className="w-full h-full bg-[#1a0d2e] flex items-center justify-center relative overflow-hidden">
      {room.timerEndsAt
        ? <TimerBar total={room.timerDuration} remaining={remaining} />
        : <AwaitingSubmissionBanner />
      }

      {/* Card centred, filling most of the screen height */}
      <motion.div
        style={cardStyle}
        className="animate-slam-in"
      >
        <Image
          src={getChallengeCardImage(challenge.id)}
          alt={challenge.en}
          fill
          sizes="48vw"
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL={BLUR_NAVY}
        />
      </motion.div>
    </div>
  );
}
