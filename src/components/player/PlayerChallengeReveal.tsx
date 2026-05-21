'use client';
import type { ChallengeCard } from '@/types/game';

interface Props {
  challenge: ChallengeCard;
}

export default function PlayerChallengeReveal({ challenge }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 px-4 min-h-[60vh]">
      <p className="text-white/60 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
        This round&apos;s challenge
      </p>
      <div className="w-full max-w-sm bg-[#1a3a6e] border border-white/20 rounded-2xl p-6 animate-slam-in shadow-2xl">
        <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
          Problem Statement
        </p>
        <p className="font-[family-name:var(--font-bebas)] text-white text-3xl leading-tight mb-4 tracking-wide">
          {challenge.en}
        </p>
        <p className="font-[family-name:var(--font-devanagari)] text-white/70 text-lg leading-relaxed">
          {challenge.hi}
        </p>
      </div>
      <p className="text-white/50 text-sm text-center animate-pulse font-[family-name:var(--font-inter)]">
        Choose your best scheme card…
      </p>
    </div>
  );
}
