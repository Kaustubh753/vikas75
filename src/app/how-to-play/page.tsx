'use client';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';

const PANELS = [
  {
    icon: '📋',
    title: 'See the problem',
    description: 'A real government problem goes up on the big screen, from healthcare to infrastructure. Everyone answers the same one.',
  },
  {
    icon: '🃏',
    title: 'Play your scheme',
    description: 'You hold seven real government schemes. Pick the one that answers the problem.',
  },
  {
    icon: '💬',
    title: 'Make your case',
    description: 'Say what your scheme does and why it fits, in 25 words or less.',
  },
  {
    icon: '👑',
    title: 'The AI judge decides',
    description: 'Claude scores how well your scheme fits the problem, then how well you argued it. Win the most rounds to take the game.',
  },
];

export default function HowToPlayPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#08070f] flex flex-col items-center px-4 py-8">
      <LogoLockup size="md" className="mb-6" />

      <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-widest mb-8">
        HOW TO PLAY
      </h2>

      <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mb-10 sm:grid-cols-4">
        {PANELS.map((panel, i) => (
          <div
            key={i}
            className="bg-[#F5F0E8] rounded-2xl p-4 flex flex-col items-center text-center animate-bounce-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <span className="text-4xl mb-3">{panel.icon}</span>
            <h3 className="font-[family-name:var(--font-bebas)] text-[#08070f] text-lg leading-tight mb-2">
              {panel.title}
            </h3>
            <p className="font-[family-name:var(--font-inter)] text-[#08070f]/70 text-xs leading-relaxed">
              {panel.description}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/')}
        className="h-14 px-10 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
      >
        Let&apos;s Play →
      </button>
    </main>
  );
}
