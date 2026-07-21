// Vikas 75 logo lockup — mirrors the landing page exactly:
// saffron left bar · attribution · title · tagline
interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LogoLockup({ size = 'md', className = '' }: Props) {
  // Proportions calibrated to match landing page:
  //   title ≈ 8× attr, tagline ≈ 1.9× attr, spacing ≈ 15% of title
  const s = {
    sm: { attr: 8,  title: 34,  tagline: 10, spacing: 5,  padLeft: 14, barInset: 5 },
    md: { attr: 9,  title: 54,  tagline: 14, spacing: 8,  padLeft: 16, barInset: 6 },
    lg: { attr: 11, title: 80,  tagline: 18, spacing: 12, padLeft: 18, barInset: 7 },
  }[size];

  return (
    <div
      className={className}
      style={{ display: 'inline-flex', flexDirection: 'column', position: 'relative', paddingLeft: s.padLeft, alignItems: 'stretch' }}
    >
      {/* Saffron left bar */}
      <div style={{ position: 'absolute', left: 0, top: s.barInset, bottom: s.barInset, width: 2, background: '#FF9933', borderRadius: 1 }} />

      {/* Attribution */}
      <p style={{
        fontFamily: 'var(--font-inter),sans-serif',
        fontWeight: 500,
        fontSize: s.attr,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(250,248,240,.65)',
        lineHeight: 1.4,
        marginBottom: s.spacing,
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
        marginTop: s.spacing,
        whiteSpace: 'nowrap',
      }}>
        The best answer isn&apos;t always right
      </p>
    </div>
  );
}
