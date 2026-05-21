// Vikas 75 logo + attribution — always together, never separate
interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LogoLockup({ size = 'md', className = '' }: Props) {
  const sizes = {
    sm: { title: 'text-4xl', sub: 'text-[10px]' },
    md: { title: 'text-6xl', sub: 'text-xs' },
    lg: { title: 'text-8xl', sub: 'text-sm' },
  };
  const s = sizes[size];
  return (
    <div className={`text-center ${className}`}>
      <h1
        className={`font-[family-name:var(--font-bebas)] text-white tracking-[0.15em] leading-none ${s.title}`}
      >
        VIKAS <span className="text-[#FF9933]">75</span>
      </h1>
      <p
        className={`font-[family-name:var(--font-inter)] text-white/60 tracking-wide mt-1 ${s.sub}`}
      >
        An initiative of the Office of Shri Sujeet Kumar
      </p>
    </div>
  );
}
