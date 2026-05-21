const LINKS = [
  { label: 'Website', href: 'https://www.sujeetkofficial.com/', icon: '🌐' },
  { label: 'Instagram', href: 'https://www.instagram.com/sujeetkofficial/', icon: '📸' },
  { label: 'X', href: 'https://x.com/SujeetKOfficial', icon: '𝕏' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/sujeet--kumar/', icon: 'in' },
  { label: 'Facebook', href: 'https://www.facebook.com/SujeetKOfficial/', icon: 'f' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC6yGMDZkljNPgX8vGUcBTbA/playlists', icon: '▶' },
];

interface Props {
  className?: string;
}

export default function SocialLinks({ className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 justify-center flex-wrap ${className}`}>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all text-sm font-bold"
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
}
