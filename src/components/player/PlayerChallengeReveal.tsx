'use client';
import Image from 'next/image';
import type { ChallengeCard } from '@/types/game';
import { getChallengeCardImage, BLUR_NAVY } from '@/lib/cards';

interface Props {
  challenge: ChallengeCard;
}

export default function PlayerChallengeReveal({ challenge }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 px-4 min-h-[60vh]">
      <p className="text-white/60 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
        This round&apos;s challenge
      </p>

      <div className="w-full max-w-sm animate-slam-in">
        {/* Physical card image — full width, card aspect ratio */}
        <div
          className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
          style={{ aspectRatio: '2.5 / 3.5' }}
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

        {/* Text fallback below the image */}
        <div className="bg-[#1a3a6e]/80 border border-white/10 rounded-2xl p-4 mt-3">
          <p className="font-[family-name:var(--font-bebas)] text-white text-xl leading-tight tracking-wide mb-2">
            {challenge.en}
          </p>
          <p className="font-[family-name:var(--font-devanagari)] text-white/60 text-sm leading-relaxed">
            {challenge.hi}
          </p>
        </div>
      </div>

      <p className="text-white/50 text-sm text-center animate-pulse font-[family-name:var(--font-inter)]">
        Choose your best scheme card…
      </p>
    </div>
  );
}
