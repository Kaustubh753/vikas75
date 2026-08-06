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
  /** Fill the parent's width instead of taking a fixed size. Each band keeps its own aspect
   *  ratio via `height: auto`, so the lockup scales with the column it sits in. */
  fluid?: boolean;
}

// Intrinsic pixel sizes of the source art — the ratios that set each band's height.
const TOP = { w: 1080, h: 57 };
const MID = { w: 1526, h: 347 };
const BOT = { w: 1401, h: 97 };

export default function LogoLockup({ size = 'md', className = '', tone = 'cream', fluid = false }: Props) {
  // Column width per size. `sm` drops the attribution and tagline: at a phone header's scale the
  // pixel type in those bands turns to mud, so only the wordmark earns the space.
  const s = { sm: { w: 132, bands: false }, md: { w: 232, bands: true }, lg: { w: 340, bands: true } }[size];
  const src = (part: string) => `/intro/logo_${part}_${tone}.webp`;
  const band = (p: { w: number; h: number }) => Math.round((s.w * p.h) / p.w);

  // Fluid: hand the width to the parent and let each band's own ratio set its height.
  const boxW = fluid ? '100%' : s.w;
  const boxH = (p: { w: number; h: number }) => (fluid ? 'auto' : band(p));
  const bands = fluid ? true : s.bands;

  return (
    <div
      className={className}
      style={{
        display: fluid ? 'flex' : 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: fluid ? '3.5%' : Math.round(s.w * 0.035), width: boxW,
      }}
    >
      {bands && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src('top')} alt="An initiative of the Office of Sujeet Kumar"
             width={TOP.w} height={TOP.h} style={{ width: boxW, height: boxH(TOP), display: 'block' }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src('mid')} alt="Vikas 75"
           width={MID.w} height={MID.h} style={{ width: boxW, height: boxH(MID), display: 'block' }} />
      {bands && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src('bottom')} alt="Play for Progress"
             width={BOT.w} height={BOT.h} style={{ width: boxW, height: boxH(BOT), display: 'block' }} />
      )}
    </div>
  );
}
