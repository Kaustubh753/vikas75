'use client';
import type { GamePhase } from '@/types/game';

interface Props {
  phase: GamePhase;
  hint?: string;
}

const MESSAGES: Partial<Record<GamePhase, string>> = {
  'challenge-reveal': 'Challenge is being revealed…',
  submission: 'Others are submitting their cards…',
  reveal: 'Submissions are being revealed…',
  judging: 'AI Judge is deliberating…',
  winner: 'Winner is being announced!',
  'between-rounds': 'Preparing next round…',
  'game-over': 'Game over! Check the big screen.',
};

export default function PlayerWaiting({ phase, hint }: Props) {
  const message = MESSAGES[phase] ?? 'Please wait…';

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh] px-4 text-center">
      {/* Message first — it's the most important info */}
      <p className="text-white font-[family-name:var(--font-bebas)] tracking-wide" style={{ fontSize: 22, lineHeight: 1.2 }}>
        {message}
      </p>
      {hint && (
        <p className="text-[#FF9933]/80 text-xs font-[family-name:var(--font-inter)]">
          {hint}
        </p>
      )}
      {/* Dots — decorative, below the message */}
      <div className="flex gap-2 mt-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-[#FF9933]/50 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
