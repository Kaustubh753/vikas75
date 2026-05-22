'use client';
import { useState, useEffect } from 'react';
import Avatar from '@/lib/avatars';
import CardBack from '@/components/ui/CardBack';
import type { GameRoom, Submission } from '@/types/game';

interface Props { room: GameRoom }

function RevealCard({ sub, isRevealed }: { sub: Submission; isRevealed: boolean }) {
  return (
    <div style={{ perspective: 1000, width: 260, height: 320, flexShrink: 0 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
        }}
      >
        {/* Back face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <CardBack />
        </div>

        {/* Front face */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}>
          <div className="bg-[#faf8f0] rounded-2xl shadow-xl overflow-hidden h-full flex flex-col">
            <div className="h-1.5 flex flex-shrink-0">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white border-t border-gray-100" />
              <div className="flex-1 bg-[#138808]" />
            </div>
            <div className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg overflow-hidden flex-shrink-0">
                  <Avatar id={sub.avatarId} size={36} />
                </div>
                <p className="font-[family-name:var(--font-inter)] text-[#1a3a6e] font-bold text-sm">{sub.playerName}</p>
              </div>
              <p className="font-[family-name:var(--font-bebas)] text-[#1a3a6e] text-lg tracking-wide leading-tight mb-2">
                {sub.schemeCard.name}
              </p>
              <p className="font-[family-name:var(--font-devanagari)] text-[#1a3a6e]/60 text-sm mb-3">{sub.schemeCard.hi}</p>
              <p className="font-[family-name:var(--font-inter)] text-gray-600 text-xs italic leading-relaxed flex-1">
                &ldquo;{sub.explanation}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectorReveal({ room }: Props) {
  const submissions = Object.values(room.submissions);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed < submissions.length) {
      const delay = revealed === 0 ? 800 : 2500;
      const t = setTimeout(() => setRevealed((n) => n + 1), delay);
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
          {submissions.map((sub, i) => (
            <RevealCard key={sub.playerId} sub={sub} isRevealed={i < revealed} />
          ))}
        </div>
      </div>
    </div>
  );
}
