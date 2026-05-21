'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

// Stage 0: Winning scheme full-screen reveal (auto 4s)
// Stage 1: Winner's explanation dramatically (auto 4s)
// Stage 2: All rankings with scores (until host advances)
export default function ProjectorWinner({ room }: Props) {
  const [stage, setStage] = useState(0);
  const v = room.lastVerdict;

  useEffect(() => {
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 4000);
    const t2 = setTimeout(() => setStage(2), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [room.round]);

  if (!v) return null;

  return (
    <div
      className="h-screen w-screen bg-[#0a1628] flex flex-col items-center justify-center relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff06 1px, transparent 1px)', backgroundSize: '28px 28px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex z-10">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Gold ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-[#FFD700]/8 blur-3xl pointer-events-none" />

      {/* Stage 0 — Winning scheme full-screen */}
      {stage === 0 && (
        <div className="flex flex-col items-center gap-8 px-12 text-center animate-slide-up">
          <p className="text-[#FF9933] tracking-[0.5em] uppercase text-sm">Round {room.round} · Winning Scheme</p>
          <div
            className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #1e4080, #0f2347)', border: '1px solid rgba(255,217,0,0.25)' }}
          >
            <div className="h-1 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
            <div className="px-16 py-14 text-center space-y-5">
              <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-xs">The Winning Scheme</p>
              <p
                className="font-[family-name:var(--font-oswald)] text-white font-bold uppercase"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
              >
                {v.schemeCard.name}
              </p>
              <div className="w-12 h-px bg-[#FF9933]/40 mx-auto" />
              <p className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0]" style={{ fontSize: '1.3rem' }}>
                {v.schemeCard.hi}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage 1 — Winner's answer + reasoning */}
      {stage === 1 && (
        <div className="flex flex-col items-center gap-8 px-12 text-center animate-slide-up max-w-4xl w-full">
          <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-sm">And the winner is…</p>
          <div className="flex items-center gap-6">
            <Avatar id={v.rankings[0]?.avatarId ?? 'a1'} size={80} className="rounded-2xl shadow-xl" />
            <p
              className="font-[family-name:var(--font-oswald)] text-[#FFD700] font-bold uppercase tracking-wider"
              style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}
            >
              {v.winnerName}
            </p>
          </div>
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1e4080, #152d5a)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="h-0.5 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
            <div className="px-10 py-8 text-center">
              <p className="text-[#c8d8f0] italic text-2xl leading-relaxed">"{v.explanation}"</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-10 py-5 max-w-2xl">
            <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-[10px] mb-2">AI Judge Says</p>
            <p className="text-white text-lg leading-relaxed">{v.reasoning}</p>
            {v.bonusPoint && (
              <p className="text-[#FF9933] text-sm mt-3 font-bold">✦ Bonus point — one-liner answer!</p>
            )}
          </div>
        </div>
      )}

      {/* Stage 2 — Full rankings */}
      {stage === 2 && (
        <div className="flex flex-col items-center gap-5 px-12 w-full max-w-4xl animate-slide-up overflow-y-auto max-h-screen py-16">
          <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-sm flex-shrink-0">Round {room.round} · Full Rankings</p>
          <div className="w-full space-y-3">
            {v.rankings.map((r, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const isWinner = i === 0;
              return (
                <div
                  key={r.playerId}
                  className={`flex items-center gap-5 rounded-2xl px-6 py-4 border animate-fade-in ${
                    isWinner
                      ? 'bg-[#FFD700]/10 border-[#FFD700]/25'
                      : 'bg-white/5 border-white/5'
                  }`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className="text-2xl w-8 flex-shrink-0">
                    {medal ?? <span className="font-[family-name:var(--font-oswald)] text-[#8aa8cc] text-xl">{i + 1}</span>}
                  </span>
                  <Avatar id={r.avatarId ?? 'a1'} size={44} className="rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`font-[family-name:var(--font-oswald)] text-xl uppercase tracking-wide ${isWinner ? 'text-[#FFD700]' : 'text-white'}`}>
                      {r.playerName}
                    </p>
                    <p className="text-[#8aa8cc] text-sm truncate">{r.schemeCard.name}</p>
                    <p className="text-white/50 text-xs italic truncate">"{r.judgeComment}"</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <span className={`font-[family-name:var(--font-oswald)] text-3xl font-bold ${isWinner ? 'text-[#FFD700]' : 'text-white/70'}`}>
                      {r.judgeScore}
                    </span>
                    <p className="text-[#8aa8cc] text-[9px] uppercase tracking-wide">/10</p>
                  </div>
                  {r.gamePoints > 0 && (
                    <div className={`px-3 py-1.5 rounded-xl flex-shrink-0 ${isWinner ? 'bg-[#FFD700]/20 border border-[#FFD700]/30' : 'bg-white/10 border border-white/10'}`}>
                      <span className={`font-[family-name:var(--font-oswald)] text-xl font-bold ${isWinner ? 'text-[#FFD700]' : 'text-white'}`}>
                        +{r.gamePoints + (r.bonusPoint ? 1 : 0)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[#8aa8cc]/60 text-sm animate-pulse tracking-widest uppercase flex-shrink-0">
            Host: advance to leaderboard
          </p>
        </div>
      )}

      <div className="absolute bottom-4">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
