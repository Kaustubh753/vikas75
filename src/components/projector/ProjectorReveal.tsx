'use client';
import { useState, useEffect } from 'react';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorReveal({ room }: Props) {
  const submissions = Object.values(room.submissions);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed < submissions.length) {
      const t = setTimeout(() => setRevealed((n) => n + 1), 2200);
      return () => clearTimeout(t);
    }
  }, [revealed, submissions.length]);

  return (
    <div className="w-full h-full bg-[#0d1b35] flex flex-col overflow-hidden">
      <div className="px-10 py-6 border-b border-white/10">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-4xl tracking-widest text-center">
          Let&apos;s see what everyone played…
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 py-6">
        <div className="flex flex-wrap gap-6 justify-center">
          {submissions.map((sub, i) => {
            const isRevealed = i < revealed;
            return (
              <div
                key={sub.playerId}
                className={`transition-all duration-700 ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                style={{ width: 260 }}
              >
                <div className="bg-[#faf8f0] rounded-2xl shadow-xl overflow-hidden">
                  {/* Card header */}
                  <div className="h-1.5 flex">
                    <div className="flex-1 bg-[#FF9933]" />
                    <div className="flex-1 bg-white border-t border-gray-100" />
                    <div className="flex-1 bg-[#138808]" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-lg overflow-hidden">
                        <Avatar id={sub.avatarId} size={36} />
                      </div>
                      <p className="font-[family-name:var(--font-inter)] text-[#1a3a6e] font-bold text-sm">{sub.playerName}</p>
                    </div>
                    <p className="font-[family-name:var(--font-bebas)] text-[#1a3a6e] text-lg tracking-wide leading-tight mb-2">
                      {sub.schemeCard.name}
                    </p>
                    <p className="font-[family-name:var(--font-devanagari)] text-[#1a3a6e]/60 text-sm mb-3">{sub.schemeCard.hi}</p>
                    <p className="font-[family-name:var(--font-inter)] text-gray-600 text-xs italic leading-relaxed">
                      &ldquo;{sub.explanation}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
