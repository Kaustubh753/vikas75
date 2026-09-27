'use client';
import { useState, useEffect, useRef } from 'react';
import Avatar from '@/lib/avatars';
import Confetti from '@/components/ui/Confetti';
import Stars from '@/components/ui/Stars';
import { getMusicManager } from '@/lib/music';
import { vibrate } from '@/lib/vibrate';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

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
        <p style={{ fontSize: 'clamp(48px,9vw,96px)' }}>🤷</p>
        <h1 className="font-[family-name:var(--font-bebas)] text-white tracking-widest text-center"
            style={{ fontSize: 'clamp(40px,7vw,80px)', lineHeight: 1 }}>
          No winner this round
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-[rgba(250,248,240,0.7)] text-center"
           style={{ fontSize: 'clamp(14px,1.4vw,20px)', maxWidth: '40ch' }}>
          {verdict.reasoning}
        </p>
        <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] tracking-[0.4em] uppercase"
           style={{ fontSize: 'clamp(16px,1.8vw,24px)' }}>
          Round {room.round}
        </p>
      </div>
    );
  }

  // The rankings list has to fit the screen it is projected onto. It is inside an
  // `overflow-hidden` column with `justify-center` and no scroll, so anything too tall is
  // silently clipped at BOTH ends: measured at 1920x1080 with 20 players, the list ran from
  // y=-251 to y=1431 and the visible window started at rank 4 — the winner, the rest of the
  // podium and the heading were all off the top of the screen, on the one screen whose entire
  // job is to announce the winner. The game explicitly supports 15+ players.
  //
  // So density scales with the table, the same way ProjectorReveal's pacing does (bug #17).
  // The judge's one-liner is the first thing dropped, because it is the only element here that
  // every player is already reading in full on their own phone.
  const n = rankings.length;
  const density = n <= 8
    ? { avatar: 40, padY: 12, gap: 12, name: 16, scheme: 12, headGap: 32, showComment: true }
    : n <= 13
      ? { avatar: 32, padY: 8, gap: 8, name: 15, scheme: 11, headGap: 20, showComment: true }
      : { avatar: 26, padY: 3, gap: 4, name: 14, scheme: 11, headGap: 10, showComment: false };

  return (
    <div className="w-full h-full bg-[#08070f] flex flex-col items-center justify-center overflow-hidden relative">
      {stage >= 1 && <Confetti />}

      {/* Stage 0: suspense — the words breathe, the dots wave; nothing bounces */}
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

      {/* Stage 1: the winner lands in three beats — the avatar rises as the gold halo blooms, the
          name is unmasked from the bottom, the verdict follows. CSS-driven so it plays the same on
          a throttled laptop and a TV; reduced motion collapses it to the end states. */}
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
            <p className="font-[family-name:var(--font-inter)] text-[rgba(250,248,240,0.7)] text-lg italic">
              &ldquo;{verdict.explanation}&rdquo;
            </p>
          </div>
          <p className="font-[family-name:var(--font-inter)] text-[rgba(250,248,240,0.55)] text-sm max-w-xl text-center animate-fade-in" style={{ animationDelay: '1s' }}>
            {verdict.reasoning}
          </p>
        </div>
      )}

      {/* Stage 2: all rankings */}
      {stage === 2 && (
        <div className="w-full px-12" style={{ maxHeight: '100%' }}>
          <h2 className="font-[family-name:var(--font-bebas)] text-white text-4xl tracking-widest text-center animate-rise-in" style={{ marginBottom: 8 }}>
            Round {room.round} Rankings
          </h2>
          {/* Says what the stars mean without spelling it out twice — points come from placement,
              the stars rate the answer itself. */}
          <p className="text-center text-[rgba(250,248,240,0.45)] text-sm tracking-widest uppercase font-[family-name:var(--font-inter)]" style={{ marginBottom: density.headGap }}>
            Stars rate this round&apos;s answer
          </p>
          <div className="max-w-3xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: density.gap }}>
            {rankings.map((r, i) => (
              <div
                key={r.playerId}
                className={`flex items-center rounded-2xl px-6 animate-rise-in ${
                  i === 0 ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' : 'bg-[rgba(250,248,240,0.04)] border border-[rgba(250,248,240,0.14)]'
                }`}
                style={{ paddingTop: density.padY, paddingBottom: density.padY, gap: density.gap + 4, animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <span className={`font-[family-name:var(--font-bebas)] text-2xl w-8 ${i === 0 ? 'text-[#FFD700]' : 'text-[rgba(250,248,240,0.45)]'}`}>
                  {i + 1}
                </span>
                <div className="rounded-xl overflow-hidden shrink-0">
                  <Avatar id={r.avatarId} size={density.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-[family-name:var(--font-inter)] text-white font-bold truncate leading-tight" style={{ fontSize: density.name }}>{r.playerName}</p>
                  <p className="text-[rgba(250,248,240,0.55)] font-[family-name:var(--font-inter)] truncate leading-tight" style={{ fontSize: density.scheme }}>{r.schemeCard.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <Stars score={r.judgeScore} />
                  {/* Two lines, not one truncated one. The judge is told to write at most 12
                      words (~65 characters); `truncate max-w-[200px]` at text-xs showed about
                      half of that and cut the rest mid-word, so the punchline the model was
                      asked to front-load routinely never arrived on the big screen. The phone
                      has always shown it in full. */}
                  {density.showComment && (
                    <p className="text-[rgba(250,248,240,0.45)] text-xs font-[family-name:var(--font-inter)] italic line-clamp-2 max-w-[260px] text-balance">{r.judgeComment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
