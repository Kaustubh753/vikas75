'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Avatar from '@/lib/avatars';
import CardBack from '@/components/ui/CardBack';
import type { GameRoom, Submission } from '@/types/game';
import { getSchemeCardImage, BLUR_CREAM } from '@/lib/cards';

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
          <div className="rounded-2xl shadow-xl overflow-hidden h-full flex flex-col bg-[#0d1b35]">
            {/* Physical card image — upper ~60% */}
            <div className="relative flex-1 overflow-hidden">
              <Image
                src={getSchemeCardImage(sub.schemeCard.id)}
                alt={sub.schemeCard.name}
                fill
                className="object-cover"
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_CREAM}
              />
            </div>
            {/* Player info + explanation — lower portion */}
            <div className="p-4 bg-[#0d1b35] flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-md overflow-hidden flex-shrink-0">
                  <Avatar id={sub.avatarId} size={28} />
                </div>
                <p className="font-[family-name:var(--font-inter)] text-white font-bold text-xs">{sub.playerName}</p>
              </div>
              <p className="font-[family-name:var(--font-inter)] text-white/70 text-xs italic leading-relaxed">
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
