'use client';
import type { JudgeVerdict } from '@/types/game';

interface Props {
  verdict: JudgeVerdict;
  playerId: string;
}

const SAFFRON = '#FF9933';
const GOLD = '#FFD700';
const CREAM = 'rgba(250,248,240,';

/* The player's own line from the verdict, on their own phone. The projector shows the full
 * table, but from across a noisy room nobody can read the judge's one-liner about THEIR
 * answer — this is the round's personal receipt: placement, stars, points, and the comment.
 *
 * Stars render fractionally (width-clipped overlay), exactly like ProjectorWinner's Stars —
 * judgeScore is a 1-decimal mean of the judge panel, so 8.3 must show as 4.15 stars here too. */
function Stars({ score }: { score: number }) {
  const outOfFive = Math.max(0, Math.min(10, score)) / 2;
  return (
    <span
      className="inline-flex items-center gap-[2px] leading-none"
      role="img"
      aria-label={`Answer quality ${outOfFive.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, outOfFive - i));
        return (
          <span key={i} className="relative text-xl" style={{ color: 'rgba(255,255,255,0.18)' }}>
            ★
            <span className="absolute left-0 top-0 overflow-hidden" style={{ width: `${fill * 100}%`, color: SAFFRON }}>
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}

const PLACE_LABEL = ['🥇 1st', '🥈 2nd', '🥉 3rd'];

export default function PlayerScorecard({ verdict, playerId }: Props) {
  const idx = verdict.rankings.findIndex((r) => r.playerId === playerId);

  if (idx < 0) {
    // In the room but not in the round (joined late, or the timer beat them with no card).
    return (
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center">
        <p className="font-[family-name:var(--font-inter)] text-sm" style={{ color: `${CREAM}0.55)` }}>
          You sat this round out — jump in on the next one!
        </p>
      </div>
    );
  }

  const mine = verdict.rankings[idx];
  const place = idx + 1;
  const placeLabel = PLACE_LABEL[idx] ?? `#${place}`;

  return (
    <div
      className="w-full max-w-sm rounded-2xl border px-5 py-4 text-left"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderColor: idx === 0 ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.12)',
      }}
    >
      <p
        className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase mb-2"
        style={{ color: SAFFRON, letterSpacing: '0.24em' }}
      >
        Your scorecard
      </p>
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide"
          style={{ color: idx === 0 ? GOLD : '#ffffff' }}
        >
          {placeLabel}
        </span>
        <span className="flex items-center gap-2">
          <Stars score={mine.judgeScore} />
          <span className="font-[family-name:var(--font-inter)] text-xs font-semibold" style={{ color: `${CREAM}0.6)` }}>
            {mine.judgeScore}/10
          </span>
        </span>
        <span
          className="font-[family-name:var(--font-bebas)] text-xl tracking-wide"
          style={{ color: mine.gamePoints > 0 ? '#37b34a' : `${CREAM}0.35)` }}
        >
          {mine.gamePoints > 0 ? `+${mine.gamePoints} pts` : '0 pts'}
        </span>
      </div>
      <p className="font-[family-name:var(--font-inter)] text-sm italic mt-3" style={{ color: `${CREAM}0.75)` }}>
        &ldquo;{mine.judgeComment}&rdquo;
      </p>
      <p className="font-[family-name:var(--font-inter)] text-[11px] mt-2" style={{ color: `${CREAM}0.4)` }}>
        You played: {mine.schemeCard.name}
      </p>
    </div>
  );
}
