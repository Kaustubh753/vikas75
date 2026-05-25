'use client';
import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorBetweenRounds({ room }: Props) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);
  const roundWinner = room.lastVerdict ? room.players[room.lastVerdict.winnerId] : null;
  const n = players.length;

  // Compress leaderboard rows when there are many players
  const rowPy  = n <= 6  ? 14 : n <= 10 ? 10 : 7;
  const rowFs  = n <= 6  ? 18 : n <= 10 ? 15 : 13;
  const rankFs = n <= 6  ? 28 : n <= 10 ? 22 : 18;
  const avatarSz = n <= 6 ? 40 : n <= 10 ? 32 : 26;

  return (
    <div className="w-full h-full bg-[#0d1b35] flex flex-col items-center justify-center gap-8 relative overflow-hidden"
         style={{ padding: 'clamp(24px, 3vw, 56px)' }}>

      <p className="text-white/40 uppercase font-[family-name:var(--font-inter)]"
         style={{ fontSize: 'clamp(11px, 0.9vw, 15px)', letterSpacing: '0.1em', fontWeight: 600 }}>
        Round {room.round} Winner
      </p>

      {/* Hero: round winner */}
      {roundWinner && room.lastVerdict ? (
        <motion.div
          className="flex flex-col items-center gap-4 text-center"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        >
          <div className="rounded-3xl overflow-hidden border-4 border-[#FFD700] shadow-2xl"
               style={{ width: 'clamp(80px, 9vw, 140px)', height: 'clamp(80px, 9vw, 140px)' }}>
            <Avatar id={roundWinner.avatarId} size={140} />
          </div>
          <div>
            <h1
              className="font-[family-name:var(--font-bebas)] text-[#FFD700] tracking-wide"
              style={{ fontSize: 'clamp(48px, 6.5vw, 96px)', lineHeight: 1 }}
            >
              {roundWinner.name}
            </h1>
            <p className="text-white/70 mt-2 font-[family-name:var(--font-inter)]"
               style={{ fontSize: 'clamp(13px, 1.2vw, 18px)' }}>
              with <span className="text-white font-semibold">{room.lastVerdict.schemeCard.name}</span>
            </p>
          </div>
          <blockquote
            className="text-white/85 italic font-[family-name:var(--font-inter)] leading-relaxed border-l-4 border-[#FF9933] pl-5 text-left"
            style={{ fontSize: 'clamp(14px, 1.4vw, 22px)', maxWidth: 'clamp(400px, 50vw, 800px)' }}
          >
            &ldquo;{room.lastVerdict.explanation}&rdquo;
          </blockquote>
        </motion.div>
      ) : (
        <motion.p
          className="text-white/50 font-[family-name:var(--font-bebas)] tracking-wide"
          style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No winner this round
        </motion.p>
      )}

      {/* Full leaderboard */}
      <div style={{ width: '100%', maxWidth: 'clamp(480px, 55vw, 900px)' }} className="space-y-2">
        {players.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
            className={`rounded-xl border flex items-center gap-3 ${
              i === 0 ? 'border-[#FFD700]/40 bg-[#FFD700]/5' : 'border-white/[0.12] bg-white/[0.06]'
            }`}
            style={{ padding: `${rowPy}px 16px`, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
          >
            <span className={`font-[family-name:var(--font-bebas)] w-7 ${i === 0 ? 'text-[#FFD700]' : 'text-white/40'}`}
                  style={{ fontSize: rankFs }}>
              {i + 1}
            </span>
            <div className="rounded-lg overflow-hidden flex-shrink-0">
              <Avatar id={p.avatarId} size={avatarSz} />
            </div>
            <span className="text-white truncate flex-1 font-[family-name:var(--font-inter)]"
                  style={{ fontSize: rowFs, fontWeight: 500 }}>
              {p.name}
            </span>
            <span className={`font-[family-name:var(--font-bebas)] ${i === 0 ? 'text-[#FFD700]' : 'text-white'}`}
                  style={{ fontSize: rankFs }}>
              {p.score}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-white/40 font-[family-name:var(--font-inter)] uppercase text-center"
         style={{ fontSize: 'clamp(10px, 0.8vw, 13px)', letterSpacing: '0.08em', fontWeight: 500 }}>
        Waiting for host to start Round {room.round + 1}…
      </p>

      <div className="absolute bottom-6 text-center">
        <p className="text-white/20 font-[family-name:var(--font-inter)]" style={{ fontSize: 11 }}>
          An initiative of the Office of Shri Sujeet Kumar
        </p>
      </div>
    </div>
  );
}
