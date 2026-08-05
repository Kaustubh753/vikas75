/* Vikas 75 logo lockup — the real brand mark, the same artwork the intro animation resolves to.
   Three stacked bands: the attribution, the pixel VIKAS 75 wordmark with its skyline, and the
   PLAY FOR PROGRESS tagline. Widths are locked to one column and each band's height derives from
   its own aspect ratio, exactly as the intro composes them, so the lockup can never drift from
   the animation.

   Colour: the source art is flat navy for the intro's cream paper. `_cream` variants (same alpha,
   colour channels flooded with #faf8f0) are used on the app's dark screens; pass tone="navy" for
   a light surface. */
interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tone?: 'cream' | 'navy';
}

// Intrinsic pixel sizes of the source art — the ratios that set each band's height.
const TOP = { w: 1080, h: 57 };
const MID = { w: 1526, h: 347 };
const BOT = { w: 1401, h: 97 };

export default function LogoLockup({ size = 'md', className = '', tone = 'cream' }: Props) {
  // Column width per size. `sm` drops the attribution and tagline: at a phone header's scale the
  // pixel type in those bands turns to mud, so only the wordmark earns the space.
  const s = { sm: { w: 132, bands: false }, md: { w: 232, bands: true }, lg: { w: 340, bands: true } }[size];
  const src = (part: string) => `/intro/logo_${part}_${tone}.webp`;
  const band = (p: { w: number; h: number }) => Math.round((s.w * p.h) / p.w);

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: Math.round(s.w * 0.035), width: s.w }}
    >
      {s.bands && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src('top')} alt="An initiative of the Office of Sujeet Kumar"
             width={s.w} height={band(TOP)} style={{ width: s.w, height: band(TOP), display: 'block' }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src('mid')} alt="Vikas 75"
           width={s.w} height={band(MID)} style={{ width: s.w, height: band(MID), display: 'block' }} />
      {s.bands && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src('bottom')} alt="Play for Progress"
             width={s.w} height={band(BOT)} style={{ width: s.w, height: band(BOT), display: 'block' }} />
      )}
    </div>
  );
}
