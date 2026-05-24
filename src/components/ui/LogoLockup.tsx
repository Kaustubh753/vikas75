// Vikas 75 logo lockup — mirrors the landing page exactly:
// saffron left bar · attribution · title · tagline
interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LogoLockup({ size = 'md', className = '' }: Props) {
  const s = {
    sm: { attr: 9,  title: 28, tagline: 11 },
    md: { attr: 10, title: 44, tagline: 14 },
    lg: { attr: 12, title: 64, tagline: 18 },
  }[size];

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative', paddingLeft: 14, alignItems: 'stretch' }}
    >
      {/* Saffron left bar */}
      <div style={{ position: 'absolute', left: 0, top: 4, bottom: 4, width: 2, background: '#FF9933', borderRadius: 1 }} />

      {/* Attribution */}
      <p style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontWeight: 500,
        fontSize: s.attr,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(250,248,240,.65)',
        lineHeight: 1.4,
        marginBottom: 6,
        whiteSpace: 'nowrap',
      }}>
        An initiative of the Office of Shri Sujeet Kumar
      </p>

      {/* Title */}
      <h1 style={{
        fontFamily: 'var(--font-yatra),var(--font-bebas),sans-serif',
        fontWeight: 400,
        fontSize: s.title,
        lineHeight: 0.92,
        letterSpacing: '-0.01em',
        color: '#fff',
        margin: 0,
        whiteSpace: 'nowrap',
      }}>
        Vikas 75
      </h1>

      {/* Tagline */}
      <p style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontWeight: 400,
        fontSize: s.tagline,
        lineHeight: 1.35,
        color: '#FF9933',
        letterSpacing: '-0.005em',
        marginTop: 6,
        whiteSpace: 'nowrap',
      }}>
        The best answer isn&apos;t always right
      </p>
    </div>
  );
}
