'use client';
import { useState, useEffect, useRef } from 'react';
import Avatar from '@/lib/avatars';
import Confetti from '@/components/ui/Confetti';
import { getMusicManager } from '@/lib/music';
import { vibrate } from '@/lib/vibrate';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

// The one authored motion sequence on the projector: four seconds of suspense, then the
// winner lands in three beats (avatar rises as the gold halo blooms, the name is unmasked from
// the bottom, the verdict follows), then the full ranking. Everything is CSS-driven so it plays
// identically on a throttled laptop and a TV, and reduced-motion collapses it to end states.
export default function ProjectorWinner({ room }: Props) {
  // If verdict already exists on mount (mid-phase refresh), skip the suspense stage
  const [stage, setStage] = useState(() => room.lastVerdict ? 1 : 0);
  const prevRound = useRef(room.round);
  // stageRef lets the one-shot timer effect read the *current* stage without a stale closure
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const verdict = room.lastVerdict;
  const rankings = verdict?.rankings ?? [];

  useEffect(() => {
    if (room.round !== prevRound.current) {
      prevRound.current = room.round;
      setStage(0);
    }
  }, [room.round]);

  useEffect(() => {
    // No celebratory fanfare when there's no winner.
    if (room.lastVerdict?.noWinner) return;
    getMusicManager().play('winner');
    // Read current stage via ref — avoids stale closure if round resets before timers fire
    if (stageRef.current >= 1) {
      const t2 = setTimeout(() => setStage(2), 4000);
      return () => clearTimeout(t2);
    }
    const t1 = setTimeout(() => {
      vibrate([100, 50, 100]);
      setStage(1);
    }, 4000);
    const t2 = setTimeout(() => setStage(2), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // intentional one-shot on mount — reads stage via stageRef to avoid stale closure

  if (!verdict) return null;

  // Explicit "no winner this round" — no fake ranking, no confetti.
  if (verdict.noWinner) {
    return (
      <div className="w-full h-full bg-[#08070f] flex flex-col items-center justify-center overflow-hidden relative gap-6 px-8">
        <p className="animate-rise-in" style={{ fontSize: 'clamp(48px,9vw,96px)' }}>🤷</p>
        <h1 className="font-[family-name:var(--font-bebas)] text-white tracking-widest text-center animate-rise-in"
            style={{ fontSize: 'clamp(40px,7vw,80px)', lineHeight: 1, animationDelay: '0.1s' }}>
          No winner this round
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-white/60 text-center animate-fade-in"
           style={{ fontSize: 'clamp(14px,1.4vw,20px)', maxWidth: '40ch', animationDelay: '0.3s' }}>
          {verdict.reasoning}
        </p>
        <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] tracking-[0.4em] uppercase animate-fade-in"
           style={{ fontSize: 'clamp(16px,1.8vw,24px)', animationDelay: '0.4s' }}>
          Round {room.round}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#08070f] flex flex-col items-center justify-center overflow-hidden relative">
      {stage >= 1 && <Confetti />}

      {/* Stage 0: suspense */}
      {stage === 0 && (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <h2 className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-3xl tracking-[0.5em] uppercase">
            Round {room.round}
          </h2>
          <h1 className="font-[family-name:var(--font-bebas)] text-white tracking-widest animate-breathe" style={{ fontSize: 'clamp(56px,8vw,120px)', lineHeight: 1 }}>
            The winner is…
          </h1>
          <div className="flex gap-3 mt-2" aria-hidden="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-4 h-4 rounded-full bg-[#FF9933] animate-dots" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Stage 1: winner reveal — three beats */}
      {stage === 1 && (
        <div className="flex flex-col items-center gap-6">
          <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-2xl tracking-[0.5em] animate-rise-in">
            ROUND {room.round} WINNER
          </p>
          <div className="rounded-3xl overflow-hidden animate-winner-avatar" style={{ animationDelay: '0.1s, 0.45s' }}>
            <Avatar id={verdict.rankings[0]?.avatarId ?? 'a1'} size={140} className="rounded-3xl" />
          </div>
          <div style={{ overflow: 'hidden', padding: '0.1em 0.2em' }}>
            <h1 className="font-[family-name:var(--font-bebas)] text-[#FFD700] leading-none tracking-wide text-center animate-unmask-up"
                style={{ fontSize: 'clamp(56px,6.5vw,96px)', animationDelay: '0.35s' }}>
              {verdict.winnerName}
            </h1>
          </div>
          <div className="bg-[#1a3a6e] rounded-2xl px-8 py-4 max-w-2xl text-center animate-rise-in" style={{ animationDelay: '0.65s' }}>
            <p className="font-[family-name:var(--font-bebas)] text-white text-2xl tracking-wide mb-2">
              {verdict.schemeCard.name}
            </p>
            <p className="font-[family-name:var(--font-inter)] text-white/70 text-lg italic">
              &ldquo;{verdict.explanation}&rdquo;
            </p>
          </div>
          <p className="font-[family-name:var(--font-inter)] text-white/50 text-sm max-w-xl text-center animate-fade-in" style={{ animationDelay: '1s' }}>
            {verdict.reasoning}
          </p>
        </div>
      )}

      {/* Stage 2: all rankings */}
      {stage === 2 && (
        <div className="w-full px-12">
          <h2 className="font-[family-name:var(--font-bebas)] text-white text-4xl tracking-widest text-center mb-8 animate-rise-in">
            Round {room.round} Rankings
          </h2>
          <div className="space-y-3 max-w-3xl mx-auto">
            {rankings.map((r, i) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-4 rounded-2xl px-6 py-3 animate-rise-in ${
                  i === 0 ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : 'bg-white/5 border border-white/5'
                }`}
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
