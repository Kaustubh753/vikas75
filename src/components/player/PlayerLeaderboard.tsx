'use client';
import { motion } from 'framer-motion';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom; playerId: string }

/* Standings on the player's own phone between rounds. Previously this phase fell through to a
 * generic waiting screen, so the only place the table existed was the projector — no use to
 * anyone not looking up at it.
 *
 * Ranking is deliberately identical to ProjectorBetweenRounds: sorted on total points, with
 * standard competition ranking so players level on points share a place (1,1,3,…) rather than
 * being split by an arbitrary tiebreak. If the two ever disagree the room notices immediately. */

const SAFFRON = '#FF9933';
const GOLD = '#FFD700';
const CREAM = 'rgba(250,248,240,';

export default function PlayerLeaderboard({ room, playerId }: Props) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score);
  const topScore = players[0]?.score ?? 0;
  const ranks: number[] = [];
  players.forEach((p, i) => { ranks[i] = i > 0 && players[i - 1].score === p.score ? ranks[i - 1] : i + 1; });
  const isLeader = (score: number) => topScore > 0 && score === topScore;

  const meIndex = players.findIndex(p => p.id === playerId);
  const me = meIndex >= 0 ? players[meIndex] : null;

  return (
    <div className="flex flex-col items-center px-4 pb-8" style={{ gap: 16, paddingTop: 10 }}>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.24em', textTransform: 'uppercase', color: SAFFRON, marginBottom: 4,
        }}>
          Round {room.round} of {room.totalRounds} complete
        </p>
        <h2 className="font-[family-name:var(--font-bebas)]"
            style={{ fontSize: 34, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>
          Standings
        </h2>
      </div>

      {/* Your own line first — on a phone the question is "where am I?", not "who is first?" */}
      {me && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 340,
            padding: '12px 16px', borderRadius: 16,
            background: 'linear-gradient(180deg,rgba(255,153,51,0.16) 0%,rgba(255,153,51,0.05) 100%)',
            border: '1px solid rgba(255,153,51,0.45)',
          }}
        >
          <span className="font-[family-name:var(--font-bebas)]"
                style={{ fontSize: 30, color: SAFFRON, minWidth: 28, lineHeight: 1 }}>
            {ranks[meIndex]}
          </span>
          <div style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            <Avatar id={me.avatarId} size={40} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 14, fontWeight: 600, color: '#fff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{me.name}</div>
            <div style={{
              fontFamily: 'var(--font-inter),sans-serif', fontSize: 10.5,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: `${CREAM}0.5)`,
            }}>
              {(me.roundsWon ?? 0) > 0 ? `🏆 ${me.roundsWon} ${me.roundsWon === 1 ? 'round' : 'rounds'} won` : 'You'}
            </div>
          </div>
          <span className="font-[family-name:var(--font-bebas)]"
                style={{ fontSize: 30, color: '#fff', lineHeight: 1 }}>{me.score}</span>
        </motion.div>
      )}

      {/* Everyone */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {players.map((p, i) => {
          const leader = isLeader(p.score);
          const isMe = p.id === playerId;
          return (
            <motion.div
              key={p.id}
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: Math.min(i * 0.04, 0.5), type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 13px', borderRadius: 12,
                background: leader ? 'rgba(255,215,0,0.06)' : 'rgba(250,248,240,0.05)',
                border: `1px solid ${leader ? 'rgba(255,215,0,0.35)' : isMe ? 'rgba(255,153,51,0.35)' : 'rgba(250,248,240,0.10)'}`,
              }}
            >
              <span className="font-[family-name:var(--font-bebas)]"
                    style={{ fontSize: 19, width: 20, color: leader ? GOLD : `${CREAM}0.45)`, lineHeight: 1 }}>
                {ranks[i]}
              </span>
              <div style={{ borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <Avatar id={p.avatarId} size={26} />
              </div>
              <span style={{
                flex: 1, minWidth: 0, fontFamily: 'var(--font-inter),sans-serif', fontSize: 13,
                fontWeight: isMe ? 600 : 500, color: isMe ? '#fff' : `${CREAM}0.82)`,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name}{isMe && <span style={{ color: SAFFRON, fontWeight: 700 }}> · you</span>}
              </span>
              {(p.roundsWon ?? 0) > 0 && (
                <span style={{ fontFamily: 'var(--font-inter),sans-serif', fontSize: 11, color: `${CREAM}0.45)` }}>
                  🏆 {p.roundsWon}
                </span>
              )}
              <span className="font-[family-name:var(--font-bebas)]"
                    style={{ fontSize: 19, color: leader ? GOLD : '#fff', lineHeight: 1, minWidth: 18, textAlign: 'right' }}>
                {p.score}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        border: '1px solid rgba(255,153,51,0.26)', borderRadius: 999,
        background: 'rgba(255,153,51,0.06)', padding: '9px 16px',
      }}>
        <span style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} className="animate-bounce" style={{
              width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,153,51,0.75)',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </span>
        {/* Always "next round": advancePhase only routes to between-rounds while
            round < totalRounds — the final round goes straight to game-over. */}
        <span style={{
          fontFamily: 'var(--font-inter),sans-serif', fontSize: 12.5, color: `${CREAM}0.75)`,
        }}>
          Next round starting soon…
        </span>
      </div>
    </div>
  );
}
