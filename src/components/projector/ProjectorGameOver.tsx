'use client';
import { useEffect } from 'react';
import Avatar from '@/lib/avatars';
import Confetti from '@/components/ui/Confetti';
import SocialLinks from '@/components/ui/SocialLinks';
import LogoLockup from '@/components/ui/LogoLockup';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorGameOver({ room }: Props) {
  // Overall winner is whoever won the most rounds; total points break ties, then a stable
  // id tiebreak so an exact tie isn't decided by arbitrary insertion order.
  const players = Object.values(room.players).sort(
    (a, b) => (b.roundsWon ?? 0) - (a.roundsWon ?? 0) || b.score - a.score || a.id.localeCompare(b.id),
  );
  const [first, second, third] = players;
  const wins = (p: { roundsWon?: number }) => {
    const w = p.roundsWon ?? 0;
    return `${w} ${w === 1 ? 'win' : 'wins'}`;
  };

  useEffect(() => {
    getMusicManager().play('winner');
  }, []);

  return (
    <div className="w-full h-full bg-[#080f1e] flex flex-col items-center justify-between overflow-hidden relative py-10"
      style={{ backgroundImage: 'radial-gradient(#ffffff05 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      <Confetti />

      {/* Tricolour top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <LogoLockup size="md" className="mt-4" />

      <div className="text-center animate-bounce-in">
        <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-3xl tracking-[0.4em] mb-1">
          GAME OVER
        </p>
        <h1 className="font-[family-name:var(--font-bebas)] text-white leading-none tracking-widest"
          style={{ fontSize: '96px' }}>
          KHEL KHATAM!
        </h1>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 w-full max-w-3xl px-8">
        {/* 2nd place */}
        {second && (
          <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="rounded-2xl overflow-hidden shadow-lg ring-4 ring-[#C0C0C0]/40">
              <Avatar id={second.avatarId} size={72} />
            </div>
            <div className="text-center">
              <p className="font-[family-name:var(--font-bebas)] text-[#C0C0C0] text-2xl tracking-wide">{second.name}</p>
              <p className="font-[family-name:var(--font-bebas)] text-white/60 text-lg">🏆 {wins(second)}</p>
              <p className="font-[family-name:var(--font-inter)] text-white/40 text-xs">{second.score} pts</p>
            </div>
            <div className="w-32 bg-[#C0C0C0]/20 border-2 border-[#C0C0C0]/40 rounded-t-xl flex items-center justify-center py-5">
              <span className="font-[family-name:var(--font-bebas)] text-[#C0C0C0] text-4xl">2</span>
            </div>
          </div>
        )}

        {/* 1st place */}
        {first && (
          <div className="flex flex-col items-center gap-3 animate-slam-in">
            <span className="text-5xl">👑</span>
            <div className="rounded-2xl overflow-hidden shadow-[0_0_60px_#FFD70060] ring-4 ring-[#FFD700]/60">
              <Avatar id={first.avatarId} size={100} />
            </div>
            <div className="text-center">
              <p className="font-[family-name:var(--font-bebas)] text-[#FFD700] text-3xl tracking-wide">{first.name}</p>
              <p className="font-[family-name:var(--font-bebas)] text-white/80 text-xl">🏆 {wins(first)}</p>
              <p className="font-[family-name:var(--font-inter)] text-white/50 text-sm">{first.score} pts</p>
            </div>
            <div className="w-32 bg-[#FFD700]/20 border-2 border-[#FFD700]/50 rounded-t-xl flex items-center justify-center py-10">
              <span className="font-[family-name:var(--font-bebas)] text-[#FFD700] text-5xl">1</span>
            </div>
          </div>
        )}

        {/* 3rd place */}
        {third && (
          <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="rounded-2xl overflow-hidden shadow-lg ring-4 ring-[#CD7F32]/40">
              <Avatar id={third.avatarId} size={60} />
            </div>
            <div className="text-center">
              <p className="font-[family-name:var(--font-bebas)] text-[#CD7F32] text-xl tracking-wide">{third.name}</p>
              <p className="font-[family-name:var(--font-bebas)] text-white/50 text-base">🏆 {wins(third)}</p>
              <p className="font-[family-name:var(--font-inter)] text-white/40 text-xs">{third.score} pts</p>
            </div>
            <div className="w-32 bg-[#CD7F32]/20 border-2 border-[#CD7F32]/40 rounded-t-xl flex items-center justify-center py-3">
              <span className="font-[family-name:var(--font-bebas)] text-[#CD7F32] text-3xl">3</span>
            </div>
          </div>
        )}
      </div>

      {/* Remaining players */}
      {players.length > 3 && (
        <div className="flex flex-wrap justify-center gap-4 px-8 mt-2">
          {players.slice(3).map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2 animate-fade-in"
              style={{ animationDelay: `${(i + 3) * 0.08}s` }}>
              <span className="font-[family-name:var(--font-bebas)] text-white/40 text-lg w-5">{i + 4}</span>
              <div className="rounded-lg overflow-hidden"><Avatar id={p.avatarId} size={28} /></div>
              <span className="font-[family-name:var(--font-inter)] text-white/70 text-sm">{p.name}</span>
              <span className="font-[family-name:var(--font-bebas)] text-white/50 text-sm">🏆 {wins(p)}</span>
              <span className="font-[family-name:var(--font-inter)] text-white/30 text-xs">{p.score} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <SocialLinks />
        <div className="text-white/20 text-xs font-[family-name:var(--font-inter)]">
          An initiative of the Office of Shri Sujeet Kumar
        </div>
      </div>
    </div>
  );
}
