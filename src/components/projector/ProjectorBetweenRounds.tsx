'use client';
import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorBetweenRounds({ room }: Props) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);
  const roundWinner = room.lastVerdict ? room.players[room.lastVerdict.winnerId] : null;

  return (
    <div className="w-full h-full bg-[#0d1b35] flex flex-col items-center justify-center gap-10 p-12 relative overflow-hidden">
      {/* Tricolour top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <p className="text-white/40 uppercase font-[family-name:var(--font-inter)]" style={{ fontSize: 13, letterSpacing: '0.08em', fontWeight: 500 }}>
        Round {room.round} Winner
      </p>

      {/* Hero: round winner */}
      {roundWinner && room.lastVerdict ? (
        <motion.div
          className="flex flex-col items-center gap-6 text-center"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18, duration: 0.6 }}
        >
          <div className="rounded-3xl overflow-hidden border-4 border-[#FFD700] shadow-2xl">
            <Avatar id={roundWinner.avatarId} size={160} />
          </div>
          <div>
            <h1
              className="font-[family-name:var(--font-bebas)] text-[#FFD700] tracking-wide"
              style={{ fontSize: 96, lineHeight: 1 }}
            >
              {roundWinner.name}
            </h1>
            <p className="text-white/70 mt-3 font-[family-name:var(--font-inter)]" style={{ fontSize: 18 }}>
              with{' '}
              <span className="text-white font-semibold">{room.lastVerdict.schemeCard.name}</span>
            </p>
          </div>
          <blockquote
            className="max-w-3xl text-white/85 italic font-[family-name:var(--font-inter)] leading-relaxed border-l-4 border-[#FF9933] pl-6 text-left"
            style={{ fontSize: 22 }}
          >
            &ldquo;{room.lastVerdict.explanation}&rdquo;
          </blockquote>
        </motion.div>
      ) : (
        <motion.p
          className="text-white/50 font-[family-name:var(--font-bebas)] tracking-wide"
          style={{ fontSize: 56 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No winner this round
        </motion.p>
      )}

      {/* Full leaderboard — all players */}
      <div className="w-full max-w-2xl space-y-2">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
              i === 0 ? 'border-[#FFD700]/40 bg-[#FFD700]/5' : 'border-white/[0.12] bg-white/[0.06]'
            }`}
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
          >
            <span className={`font-[family-name:var(--font-bebas)] text-2xl w-7 ${i === 0 ? 'text-[#FFD700]' : 'text-white/40'}`}>
              {i + 1}
            </span>
            <div className="rounded-lg overflow-hidden">
              <Avatar id={p.avatarId} size={32} />
            </div>
            <span className="text-white truncate flex-1 font-[family-name:var(--font-inter)]" style={{ fontSize: 14 }}>
              {p.name}
            </span>
            <span className={`font-[family-name:var(--font-bebas)] text-2xl ${i === 0 ? 'text-[#FFD700]' : 'text-white'}`}>
              {p.score}
            </span>
          </div>
        ))}
      </div>

      {/* Waiting indicator — no false countdown */}
      <p className="text-white/40 font-[family-name:var(--font-inter)] uppercase text-center" style={{ fontSize: 13, letterSpacing: '0.08em', fontWeight: 500 }}>
        Waiting for host to start Round {room.round + 1}…
      </p>

      <div className="absolute bottom-4 text-center">
        <p className="text-white/20 font-[family-name:var(--font-inter)]" style={{ fontSize: 11 }}>
          An initiative of the Office of Shri Sujeet Kumar
        </p>
      </div>
    </div>
  );
}
