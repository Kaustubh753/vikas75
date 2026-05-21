'use client';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';

const PANELS = [
  {
    icon: '📋',
    title: 'A Challenge is Read',
    description: 'A real government problem is revealed — from healthcare to infrastructure. Everyone sees it on the big screen.',
  },
  {
    icon: '🃏',
    title: 'Pick the Best Scheme',
    description: 'From your hand of 7 cards, choose the government scheme that best solves the challenge. Think fast!',
  },
  {
    icon: '💬',
    title: 'Justify in 25 Words',
    description: 'Type your explanation — why does your scheme work? Keep it punchy. Bonus point for one crisp sentence!',
  },
  {
    icon: '👑',
    title: 'The AI Judge Decides',
    description: 'Claude AI judges all submissions for creativity and fit. The winner earns points — highest score wins the game!',
  },
];

export default function HowToPlayPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#0d1b2e] flex flex-col items-center px-4 py-8">
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
            <h3 className="font-[family-name:var(--font-bebas)] text-[#0d1b2e] text-lg leading-tight mb-2">
              {panel.title}
            </h3>
            <p className="font-[family-name:var(--font-inter)] text-[#0d1b2e]/70 text-xs leading-relaxed">
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
