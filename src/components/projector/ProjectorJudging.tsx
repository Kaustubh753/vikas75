'use client';
import { useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

/* The judge takes a few seconds. A bare spinner for that beat leaves the room with nothing to
 * look at and no memory of what is being decided, so the challenge stays on screen and the
 * count of answers in the pile sits under the animation. */

export default function ProjectorJudging({ room }: Props) {
  const challenge = room.currentChallenge;
  const count = Object.keys(room.submissions).length;

  useEffect(() => {
    getMusicManager().play('drumroll');
  }, []);

  return (
    <div className="w-full h-full bg-[#08070f] flex flex-col items-center justify-between overflow-hidden"
         style={{ padding: 'clamp(24px, 3.5vh, 48px) clamp(24px, 3vw, 64px)' }}>

      {/* The challenge, in the same navy plate the submission screen uses */}
      {challenge ? (
        <div className="bg-[#1a3a6e] rounded-2xl w-full max-w-6xl text-center"
             style={{ padding: 'clamp(12px, 1.2vw, 20px) clamp(16px, 1.5vw, 28px)' }}>
          <p className="text-white/50 uppercase tracking-widest font-[family-name:var(--font-inter)]"
             style={{ fontSize: 'clamp(9px, 0.65vw, 11px)', marginBottom: 4 }}>
            Problem Statement
          </p>
          <p className="font-[family-name:var(--font-bebas)] text-white tracking-wide leading-snug"
             style={{ fontSize: 'clamp(20px, 2.2vw, 36px)' }}>
            {challenge.en}
          </p>
          {challenge.hi && (
            <p className="font-[family-name:var(--font-devanagari)] leading-relaxed"
               style={{ fontSize: 'clamp(13px, 1.35vw, 22px)', color: 'rgba(173,200,255,0.85)', marginTop: 6 }}>
              {challenge.hi}
            </p>
          )}
        </div>
      ) : <div />}

      <div className="flex flex-col items-center" style={{ gap: 'clamp(24px, 4vh, 48px)' }}>
        {/* Pulsing rings */}
        <div className="relative flex items-center justify-center"
             style={{ width: 'clamp(120px, 13vh, 176px)', height: 'clamp(120px, 13vh, 176px)' }}>
          <div className="absolute inset-0 rounded-full border-2 border-[#FF9933]/20 animate-ping" />
          <div className="absolute inset-4 rounded-full border-2 border-[#FF9933]/30 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute inset-8 rounded-full border-2 border-[#FF9933]/40 animate-ping" style={{ animationDelay: '0.6s' }} />
          <span className="relative z-10" style={{ fontSize: 'clamp(36px, 5vh, 64px)' }}>⚖️</span>
        </div>

        <div className="text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-white tracking-widest leading-none"
              style={{ fontSize: 'clamp(40px, 6.5vh, 84px)' }}>
            AI Judge Deliberates
          </h2>
          {count > 0 && (
            <p className="font-[family-name:var(--font-inter)] uppercase text-white/35"
               style={{ marginTop: 'clamp(8px, 1.4vh, 16px)', fontSize: 'clamp(10px, 0.85vw, 14px)', letterSpacing: '0.24em' }}>
              Weighing {count} {count === 1 ? 'answer' : 'answers'}
            </p>
          )}
          <div className="flex justify-center gap-2" style={{ marginTop: 'clamp(12px, 2vh, 22px)' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-[#FF9933] animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {room.round > 0 ? (
        <p className="font-[family-name:var(--font-inter)] uppercase text-white/25"
           style={{ fontSize: 'clamp(10px, 0.8vw, 14px)', letterSpacing: '0.28em' }}>
          Round {room.round} of {room.totalRounds}
        </p>
      ) : <div />}
    </div>
  );
}
