'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import CountUp from '@/components/ui/CountUp';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

function TimerRing({ total, remaining }: { total: number; remaining: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className={`relative w-24 h-24 ${urgent ? 'animate-pulse-ring' : ''}`}>
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
        <span className={`font-[family-name:var(--font-bebas)] text-2xl ${urgent ? 'text-red-400' : 'text-white'}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

export default function ProjectorSubmission({ room }: Props) {
  const [remaining, setRemaining] = useState(room.timerDuration);
  const challenge = room.currentChallenge;
  const players = Object.values(room.players);
  const submittedIds = new Set(Object.keys(room.submissions));
  const submittedCount = submittedIds.size;

  useEffect(() => {
    getMusicManager().play('ticking');
  }, []);

  useEffect(() => {
    if (!room.timerEndsAt) return;
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((room.timerEndsAt! - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [room.timerEndsAt]);

  return (
    <div className="w-full h-full bg-[#0d1b2e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-10 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
        {challenge && (
          <div className="bg-[#1a3a6e] rounded-2xl px-6 py-3 max-w-2xl">
            <p className="text-white/50 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)] mb-1">
              Problem Statement
            </p>
            <p className="font-[family-name:var(--font-bebas)] text-white text-2xl tracking-wide leading-snug">
              {challenge.en}
            </p>
          </div>
        )}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-4xl"><CountUp value={submittedCount} />/{players.length}</p>
            <p className="text-white/40 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">Submitted</p>
          </div>
          {room.timerEndsAt && <TimerRing total={room.timerDuration} remaining={remaining} />}
        </div>
      </div>

      {/* Player grid */}
      <div className="flex-1 p-10">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
          {players.map((p) => {
            const submitted = submittedIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`rounded-2xl border-2 p-4 flex flex-col items-center gap-2 transition-all duration-500 ${
                  submitted
                    ? 'border-[#138808] bg-[#138808]/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className={`rounded-xl overflow-hidden transition-all duration-500 ${submitted ? 'opacity-60 scale-95' : ''}`}>
                  <Avatar id={p.avatarId} size={48} />
                </div>
                <p className="text-white text-sm font-[family-name:var(--font-inter)] text-center truncate w-full">
                  {p.name}
                </p>
                {submitted ? (
                  <span className="text-[#138808] text-xl">✓</span>
                ) : (
                  <span className="text-white/20 text-xs uppercase tracking-wider font-[family-name:var(--font-inter)]">Thinking…</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
