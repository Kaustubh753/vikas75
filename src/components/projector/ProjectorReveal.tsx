'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Avatar from '@/lib/avatars';
import CardBack from '@/components/ui/CardBack';
import type { GameRoom, Submission } from '@/types/game';
import { getSchemeCardImage, BLUR_CREAM } from '@/lib/cards';

interface Props { room: GameRoom }

function RevealCard({ sub, isRevealed, h }: { sub: Submission; isRevealed: boolean; h: string }) {
  // The printed card is 413x554, so deriving width from height keeps it in proportion and lets
  // object-contain show the whole face without letterboxing.
  return (
    <div style={{ perspective: 1000, height: h, width: `calc(${h} * 413 / 554)`, flexShrink: 0 }}>
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
          <div className="rounded-2xl shadow-xl overflow-hidden h-full flex flex-col bg-[#08070f]">
            {/* Physical card image — upper portion */}
            <div className="relative flex-1 overflow-hidden min-h-0">
              <Image
                src={getSchemeCardImage(sub.schemeCard.id)}
                alt={sub.schemeCard.name}
                fill
                sizes="(min-width: 1440px) 260px, 18vw"
                className="object-contain"
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_CREAM}
              />
              {/* No name overlay: the card face already prints its own title, and the pill sat
                  on top of the card's bullets. */}
              <div className="hidden">
              </div>
            </div>

            {/* Player info + explanation */}
            <div className="px-3 py-3 bg-[#08070f] flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-md overflow-hidden flex-shrink-0">
                  <Avatar id={sub.avatarId} size={26} />
                </div>
                <p
                  className="font-[family-name:var(--font-inter)] text-white font-semibold leading-tight"
                  style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}
                >
                  {sub.playerName}
                </p>
              </div>
              {/* Explanation — line-clamp-3 so long answers never crush the card image */}
              <p
                className="font-[family-name:var(--font-inter)] text-white/75 italic leading-snug"
                style={{
                  fontSize: 'clamp(10px, 0.9vw, 13px)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
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
  // Snapshot submissions on mount — prevent re-ordering mid-animation when Pusher fires room updates
  const submissionsRef = useRef<Submission[]>(Object.values(room.submissions));
  const submissions = submissionsRef.current;
  // A four-card round left the row marooned in the middle of the stage. Fewer cards, taller cards.
  const cardH = submissions.length <= 4 ? 'clamp(300px, 46vh, 500px)'
    : submissions.length <= 8 ? 'clamp(240px, 30vh, 360px)'
    : 'clamp(180px, 21vh, 260px)';
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed < submissions.length) {
      // Reveal pacing — fewer players = more drama per card; many players = shorter delay so total time stays sane
      const baseDelay = submissions.length <= 4 ? 1800 : submissions.length <= 8 ? 1200 : 900;
      const delay = revealed === 0 ? 600 : baseDelay;
      const t = setTimeout(() => setRevealed((n) => n + 1), delay);
      return () => clearTimeout(t);
    }
  }, [revealed, submissions.length]);

  return (
    <div className="w-full h-full bg-[#08070f] flex flex-col overflow-hidden">
      <div className="px-10 py-6 border-b border-white/10">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-4xl tracking-widest text-center">
          Let&apos;s see what everyone played…
        </h2>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 py-6 min-h-0 overflow-y-auto">
        <div className="flex flex-wrap gap-6 justify-center">
          {submissions.map((sub, i) => (
            <RevealCard key={sub.playerId} sub={sub} isRevealed={i < revealed} h={cardH} />
          ))}
        </div>
      </div>
    </div>
  );
}
