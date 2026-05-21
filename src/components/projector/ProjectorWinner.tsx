'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import Confetti from '@/components/ui/Confetti';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorWinner({ room }: Props) {
  const [stage, setStage] = useState(0);
  const prevRound = useRef(room.round);

  const verdict = room.lastVerdict;
  const rankings = verdict?.rankings ?? [];

  useEffect(() => {
    if (room.round !== prevRound.current) {
      prevRound.current = room.round;
      setStage(0);
    }
  }, [room.round]);

  useEffect(() => {
    getMusicManager().play('winner');
    const t1 = setTimeout(() => {
      try { (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.([100, 50, 100]); } catch {}
      setStage(1);
    }, 4000);
    const t2 = setTimeout(() => setStage(2), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!verdict) return null;
  const winner = room.players[verdict.winnerId];

  return (
    <div className="w-full h-full bg-[#0d1b35] flex flex-col items-center justify-center overflow-hidden relative">
      {stage >= 1 && <Confetti />}

      {/* Stage 0: suspense */}
      {stage === 0 && (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="flex gap-2 mb-2">
            {[0,1,2].map(i => (
              <div key={i} className="w-4 h-4 rounded-full bg-[#FF9933] animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
            ))}
          </div>
          <h2 className="font-[family-name:var(--font-bebas)] text-white/60 text-3xl tracking-[0.5em] uppercase">
            Round {room.round}
          </h2>
          <h1 className="font-[family-name:var(--font-bebas)] text-white text-8xl tracking-widest">
            The winner is…
          </h1>
        </div>
      )}

      {/* Stage 1: winner reveal */}
      {stage === 1 && (
        <motion.div className="flex flex-col items-center gap-6" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
          <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-2xl tracking-[0.5em]">
            ROUND {room.round} WINNER
          </p>
          <div
            className="rounded-3xl overflow-hidden shadow-[0_0_80px_#FFD70060]"
            style={{ filter: 'drop-shadow(0 0 40px #FFD70040)' }}
          >
            <Avatar id={verdict.rankings[0]?.avatarId ?? 'a1'} size={140} className="rounded-3xl" />
          </div>
          <h1 className="font-[family-name:var(--font-bebas)] text-[#FFD700] leading-none tracking-wide text-center"
              style={{ fontSize: '80px' }}>
            {verdict.winnerName}
          </h1>
          <div className="bg-[#1a3a6e] rounded-2xl px-8 py-4 max-w-2xl text-center">
            <p className="font-[family-name:var(--font-bebas)] text-white text-2xl tracking-wide mb-2">
              {verdict.schemeCard.name}
            </p>
            <p className="font-[family-name:var(--font-inter)] text-white/70 text-lg italic">
              &ldquo;{verdict.explanation}&rdquo;
            </p>
          </div>
          <p className="font-[family-name:var(--font-inter)] text-white/50 text-sm max-w-xl text-center">
            {verdict.reasoning}
          </p>
        </motion.div>
      )}

      {/* Stage 2: all rankings */}
      {stage === 2 && (
        <div className="w-full px-12 animate-slide-up">
          <h2 className="font-[family-name:var(--font-bebas)] text-white text-4xl tracking-widest text-center mb-8">
            Round {room.round} Rankings
          </h2>
          <div className="space-y-3 max-w-3xl mx-auto">
            {rankings.map((r, i) => (
              <motion.div
                key={r.playerId}
                className={`flex items-center gap-4 rounded-2xl px-6 py-3 ${
                  i === 0 ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : 'bg-white/5 border border-white/5'
                }`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <span className={`font-[family-name:var(--font-bebas)] text-2xl w-8 ${i === 0 ? 'text-[#FFD700]' : 'text-white/40'}`}>
                  {i + 1}
                </span>
                <div className="rounded-xl overflow-hidden">
                  <Avatar id={r.avatarId} size={40} />
                </div>
                <div className="flex-1">
                  <p className="font-[family-name:var(--font-inter)] text-white font-bold">{r.playerName}</p>
                  <p className="text-white/50 text-xs font-[family-name:var(--font-inter)]">{r.schemeCard.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-xl">{r.judgeScore}/10</p>
                  <p className="text-white/40 text-xs font-[family-name:var(--font-inter)] italic truncate max-w-[200px]">{r.judgeComment}</p>
                </div>
                {r.bonusPoint && (
                  <span className="text-[#FFD700] text-sm font-[family-name:var(--font-inter)] font-bold">+bonus</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
