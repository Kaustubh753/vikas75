'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import CountUp from '@/components/ui/CountUp';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

function TimerRing({ total, remaining }: { total: number; remaining: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className={`relative flex-shrink-0 ${urgent ? 'animate-pulse' : ''}`} style={{ width: 'clamp(120px, 10vw, 176px)', height: 'clamp(120px, 10vw, 176px)' }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={urgent ? '#ef4444' : '#FF9933'}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      {/* At zero the round is over but the reveal hasn't landed yet (the client fires timer-expire,
          the server advances, the new phase broadcasts). Showing a bare "0 sec" for that beat reads
          as a stuck counter, so say TIME'S UP instead — the same wait, but clearly deliberate. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {remaining > 0 ? (
          <>
            <span className={`font-[family-name:var(--font-bebas)] leading-none ${urgent ? 'text-red-400' : 'text-white'}`}
                  style={{ fontSize: 'clamp(36px, 4.2vw, 64px)' }}>
              {remaining}
            </span>
            <span className="text-white/40 uppercase tracking-widest font-[family-name:var(--font-inter)]"
                  style={{ fontSize: 'clamp(9px, 0.7vw, 12px)' }}>sec</span>
          </>
        ) : (
          <span className="font-[family-name:var(--font-bebas)] leading-none text-red-400 text-center px-2"
                style={{ fontSize: 'clamp(16px, 1.7vw, 26px)' }}>
            Time&apos;s up
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectorSubmission({ room }: Props) {
  const [remaining, setRemaining] = useState(() =>
    room.timerEndsAt ? Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)) : room.timerDuration
  );
  const challenge = room.currentChallenge;
  const players = Object.values(room.players);
  const submittedIds = new Set(Object.keys(room.submissions));
  const submittedCount = submittedIds.size;
  const n = players.length;

  useEffect(() => {
    getMusicManager().play('ticking');
  }, []);

  useEffect(() => {
    if (!room.timerEndsAt) return;
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((room.timerEndsAt! - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [room.timerEndsAt]);

  // Adaptive tile size — fewer players get larger tiles so the screen fills nicely
  const minTile = n <= 4 ? 220 : n <= 8 ? 180 : n <= 12 ? 150 : 120;
  const maxTile = Math.round(minTile * 1.5);
  // Tiles are sized to the room. With only a few players the old sizes left one small row
  // marooned in the middle of a 1080p stage, so the fewer the players the larger their tile.
  const avatarSize = n <= 4 ? 132 : n <= 8 ? 92 : n <= 12 ? 60 : 44;
  const tileMinH = n <= 4 ? 300 : n <= 8 ? 230 : n <= 12 ? 170 : 130;

  return (
    <div className="w-full h-full bg-[#08070f] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-10 pt-6 pb-4 flex items-center justify-between border-b border-white/10 gap-6">
        {challenge && (
          <div className="bg-[#1a3a6e] rounded-2xl flex-1 min-w-0" style={{ padding: 'clamp(12px, 1.2vw, 20px) clamp(16px, 1.5vw, 28px)' }}>
            <p className="text-white/50 uppercase tracking-widest font-[family-name:var(--font-inter)]"
               style={{ fontSize: 'clamp(9px, 0.65vw, 11px)', marginBottom: 4 }}>
              Problem Statement
            </p>
            <p className="font-[family-name:var(--font-bebas)] text-white tracking-wide leading-snug"
               style={{ fontSize: 'clamp(20px, 2.2vw, 36px)' }}>
              {challenge.en}
            </p>
            {/* The card the players are answering is bilingual; the statement they answer it
                against was English-only once it became live text. */}
            {challenge.hi && (
              <p className="font-[family-name:var(--font-devanagari)] leading-relaxed"
                 style={{ fontSize: 'clamp(18px, 2.05vw, 33px)', lineHeight: 1.5, color: 'rgba(173,200,255,0.92)', marginTop: 10 }}>
                {challenge.hi}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-center">
            <p className="font-[family-name:var(--font-bebas)] text-[#FF9933]" style={{ fontSize: 'clamp(28px, 3.5vw, 56px)', lineHeight: 1 }}>
              <CountUp value={submittedCount} />/{n}
            </p>
            <p className="text-white/40 uppercase tracking-widest font-[family-name:var(--font-inter)]"
               style={{ fontSize: 'clamp(9px, 0.65vw, 11px)' }}>
              Submitted
            </p>
          </div>
          {room.timerEndsAt && <TimerRing total={room.timerDuration} remaining={remaining} />}
        </div>
      </div>

      {/* Player grid — tiles grow to fill space with fewer players */}
      <div className="flex-1 p-8 overflow-hidden">
        <div
          className="grid gap-4 h-full content-center justify-center"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minTile}px, ${maxTile}px))`, gridAutoRows: `minmax(${tileMinH}px, auto)` }}
        >
          {players.map((p) => {
            const submitted = submittedIds.has(p.id);
            const online = p.lastSeen ? Date.now() - p.lastSeen < 45_000 : true;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-500 ${
                  submitted
                    ? 'border-[#138808] bg-[#138808]/10'
                    : online
                    ? 'border-white/10 bg-white/5'
                    : 'border-white/5 bg-white/[0.02]'
                }`}
                style={{ padding: 'clamp(12px, 1.2vw, 20px)' }}
              >
                <div className={`relative rounded-xl overflow-hidden transition-all duration-500 ${submitted ? 'opacity-60 scale-95' : !online ? 'opacity-40' : ''}`}>
                  <Avatar id={p.avatarId} size={avatarSize} />
                  <span
                    className="absolute bottom-0.5 right-0.5 rounded-full border-2 border-[#08070f]"
                    style={{
                      width: Math.max(10, avatarSize * 0.18),
                      height: Math.max(10, avatarSize * 0.18),
                      background: online ? '#22c55e' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                </div>
                <p className={`font-[family-name:var(--font-inter)] text-center truncate w-full ${online ? 'text-white' : 'text-white/40'}`}
                   style={{ fontSize: 'clamp(11px, 1vw, 16px)', fontWeight: 500 }}>
                  {p.name}
                </p>
                {submitted ? (
                  <span className="text-[#138808]" style={{ fontSize: 'clamp(18px, 2vw, 28px)' }}>✓</span>
                ) : online ? (
                  <span className="text-white/25 uppercase tracking-wider font-[family-name:var(--font-inter)]"
                        style={{ fontSize: 'clamp(9px, 0.7vw, 11px)' }}>Thinking…</span>
                ) : (
                  <span className="text-white/20 uppercase tracking-wider font-[family-name:var(--font-inter)]"
                        style={{ fontSize: 'clamp(9px, 0.7vw, 11px)' }}>Away</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
