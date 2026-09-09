/**
 * The judge's answer-quality rating, as five stars.
 *
 * The judge scores 1–10 (finer grain keeps the ranking order clean) and this halves it, filling
 * the last star fractionally — the display score is already to one decimal. Quality is display
 * only: points come from placement, not from this.
 *
 * One component because there were two, on the projector and on the player's phone, with the
 * clamping and fill arithmetic written out identically in both and only the star size differing.
 * CLAUDE.md held them in step by asking prose to ("same math as ProjectorWinner's Stars"), which
 * is exactly the arrangement that let six ranking comparators drift apart in bug #25.
 */
export default function Stars({ score, size = 'lg' }: { score: number; size?: 'lg' | 'xl' }) {
  const outOfFive = Math.max(0, Math.min(10, score)) / 2;
  return (
    <span
      className={`inline-flex items-center leading-none ${size === 'xl' ? 'gap-[2px]' : 'gap-[3px]'}`}
      role="img"
      aria-label={`Answer quality ${outOfFive.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, outOfFive - i)); // 0 → empty, 1 → full
        return (
          <span key={i} className={`relative ${size === 'xl' ? 'text-xl' : 'text-lg'}`} style={{ color: 'rgba(255,255,255,0.18)' }}>
            ★
            <span className="absolute left-0 top-0 overflow-hidden" style={{ width: `${fill * 100}%`, color: '#FF9933' }}>
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}
