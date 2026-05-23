'use client';
import Image from 'next/image';
import type { ChallengeCard } from '@/types/game';
import { getChallengeCardImage, BLUR_NAVY } from '@/lib/cards';

interface Props {
  challenge: ChallengeCard;
}

// Card dimensions: 413×554 → display at 280×375 (same aspect ratio)
const CARD_W = 280;
const CARD_H = Math.round(CARD_W * (554 / 413)); // 375

export default function PlayerChallengeReveal({ challenge }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8 px-4 min-h-[60vh]">
      <p className="text-white/50 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
        This round&apos;s challenge
      </p>

      {/* Physical card — explicit width/height, no fill conflict */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl animate-slam-in"
        style={{ width: CARD_W, height: CARD_H, position: 'relative', flexShrink: 0 }}
      >
        <Image
          src={getChallengeCardImage(challenge.id)}
          alt={challenge.en}
          fill
          sizes="280px"
          className="object-cover"
          priority
          placeholder="blur"
          blurDataURL={BLUR_NAVY}
        />
      </div>

      <p className="text-white/40 text-sm text-center animate-pulse font-[family-name:var(--font-inter)]">
        Choose your best scheme card…
      </p>
    </div>
  );
}
