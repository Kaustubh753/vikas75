import Link from 'next/link';
import LogoLockup from '@/components/ui/LogoLockup';

/* Shared chrome + prose system for the two legal pages (/privacy, /terms). Both must read
 * identically, so the layout and typography live here once and each page passes only its
 * content. Server component (no hooks) so the pages that use it can export `metadata`. */

export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main
      className="min-h-screen bg-[#08070f]"
      style={{ color: 'rgba(250,248,240,0.82)', fontFamily: 'var(--font-inter),system-ui,sans-serif' }}
    >
      {/* Saffron glow, top-centre — the same brand wash the landing/explore pages use. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', left: '50%', top: '-25%', width: '80vw', height: '70vh',
          transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at center,rgba(255,153,51,.10) 0%,rgba(255,153,51,.03) 35%,transparent 65%)',
        }}
      />

      <div
        style={{ position: 'relative', zIndex: 1 }}
        className="mx-auto w-full max-w-[760px] px-5 sm:px-8 pt-10 pb-20"
      >
        {/* Header */}
        <header className="flex flex-col items-start gap-6 mb-10">
          <Link href="/" aria-label="Back to Vikas 75 home" className="inline-flex">
            <LogoLockup size="sm" />
          </Link>
          <div>
            <h1
              className="font-[family-name:var(--font-bebas)] text-white leading-none"
              style={{ fontSize: 'clamp(34px, 8vw, 56px)', letterSpacing: '0.02em' }}
            >
              {title}
            </h1>
            <p className="mt-2 text-[13px]" style={{ color: 'rgba(250,248,240,0.42)' }}>
              Last updated: {lastUpdated}
            </p>
          </div>
          {/* Tricolour rule */}
          <div className="flex h-[3px] w-full max-w-[220px] overflow-hidden rounded-full">
            <div className="flex-1" style={{ background: '#FF9933' }} />
            <div className="flex-1" style={{ background: '#ffffff' }} />
            <div className="flex-1" style={{ background: '#138808' }} />
          </div>
        </header>

        {intro && (
          <div
            className="mb-10 rounded-2xl p-5 text-[15px] leading-relaxed"
            style={{
              background: 'rgba(255,153,51,0.06)',
              border: '1px solid rgba(255,153,51,0.18)',
              color: 'rgba(250,248,240,0.78)',
            }}
          >
            {intro}
          </div>
        )}

        <div className="flex flex-col gap-9">{children}</div>

        {/* Footer nav between the two documents + home */}
        <footer
          className="mt-16 pt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]"
          style={{ borderTop: '1px solid rgba(250,248,240,0.12)' }}
        >
          <LegalNavLink href="/">← Home</LegalNavLink>
          <LegalNavLink href="/privacy">Privacy Policy</LegalNavLink>
          <LegalNavLink href="/terms">Terms &amp; Conditions</LegalNavLink>
          <span className="ml-auto" style={{ color: 'rgba(250,248,240,0.35)' }}>
            © 2026 · Vikas 75
          </span>
        </footer>
      </div>
    </main>
  );
}

function LegalNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="transition-colors"
      style={{ color: 'rgba(250,248,240,0.6)', textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}

/** A numbered section: Bebas heading + body content. */
export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="font-[family-name:var(--font-bebas)] text-white mb-3 flex items-baseline gap-3"
        style={{ fontSize: 'clamp(21px, 4.5vw, 27px)', letterSpacing: '0.02em' }}
      >
        <span style={{ color: '#FF9933' }}>{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed" style={{ color: 'rgba(250,248,240,0.78)' }}>
        {children}
      </div>
    </section>
  );
}

/** Emphasised inline term (e.g. a storage key or a party name). */
export function Term({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: 'rgba(250,248,240,0.95)', fontWeight: 600 }}>{children}</strong>;
}

/** A bulleted list with the brand's saffron markers. */
export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden style={{ color: '#FF9933', lineHeight: 1.55, flexShrink: 0 }}>
            ›
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** An external link styled to the brand. */
export function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#FF9933', textDecoration: 'none', borderBottom: '1px solid rgba(255,153,51,0.4)' }}
    >
      {children}
    </a>
  );
}
