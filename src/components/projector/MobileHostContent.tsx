'use client';
import { useState, useEffect } from 'react';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

// Compact, portrait-native view of the live game state for a host running the game from a
// phone. The TV/projector phase layouts are designed for a 16:9 screen and look cramped on a
// phone; this shows the same information in a vertical, readable layout. Host controls
// (advance, kick, settings, music, end) come from <HostOverlay> rendered below by ProjectorView.

const PHASE_LABEL: Record<string, string> = {
  lobby: 'Lobby',
  'challenge-reveal': 'Challenge',
  submission: 'Submissions Open',
  reveal: 'Reveal',
  judging: 'AI Judging',
  winner: 'Winner',
  'between-rounds': 'Standings',
  'game-over': 'Game Over',
};

const label: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontWeight: 600,
};
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, padding: 16,
};

export default function MobileHostContent({ room }: { room: GameRoom }) {
  const players = Object.values(room.players);
  const submittedIds = new Set(Object.keys(room.submissions));
  const submittedCount = submittedIds.size;
  const challenge = room.currentChallenge;
  const verdict = room.lastVerdict;

  const [remaining, setRemaining] = useState(() =>
    room.timerEndsAt ? Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (room.phase !== 'submission' || !room.timerEndsAt) return;
    const t = setInterval(() => setRemaining(Math.max(0, Math.ceil((room.timerEndsAt! - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, [room.phase, room.timerEndsAt]);

  const leaderboard = [...players].sort((a, b) => b.roundsWon - a.roundsWon || b.score - a.score);

  const ChallengeBlock = () =>
    challenge ? (
      <div style={{ ...card, background: '#1a3a6e', borderColor: 'rgba(255,153,51,0.25)' }}>
        <p style={{ ...label, marginBottom: 8 }}>Problem Statement</p>
        <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 22, lineHeight: 1.2, letterSpacing: '0.02em' }}>{challenge.en}</p>
        <p style={{ fontFamily: 'var(--font-devanagari)', fontSize: 14, color: 'rgba(173,200,255,0.85)', marginTop: 8, lineHeight: 1.5 }}>{challenge.hi}</p>
      </div>
    ) : null;

  const PlayerRows = ({ showStatus }: { showStatus?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {players.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No players have joined yet.</p>}
      {players.map((p) => {
        const submitted = submittedIds.has(p.id);
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <Avatar id={p.avatarId} size={32} />
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
            {showStatus && (
              submitted
                ? <span style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>✓ In</span>
                : <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Thinking…</span>
            )}
          </div>
        );
      })}
    </div>
  );

  const LeaderboardRows = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {leaderboard.map((p, i) => (
        <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, width: 22, color: i === 0 ? '#FF9933' : 'rgba(255,255,255,0.5)' }}>{i + 1}</span>
          <div style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}><Avatar id={p.avatarId} size={30} /></div>
          <span style={{ flex: 1, fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, color: i === 0 ? '#FF9933' : '#fff' }}>{p.score}</span>
        </div>
      ))}
    </div>
  );

  function content() {
    switch (room.phase) {
      case 'lobby':
        return (
          <>
            <div style={card}>
              <p style={{ ...label, marginBottom: 6 }}>Players ({players.length})</p>
              <PlayerRows />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 1.5 }}>
              Share the room code so players can join. Tap <b style={{ color: '#FF9933' }}>Start Game</b>{' '}below when everyone&apos;s in.
            </p>
          </>
        );
      case 'challenge-reveal':
        return (
          <>
            <ChallengeBlock />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>Tap <b style={{ color: '#FF9933' }}>Open Submissions</b>{' '}below to start the timer.</p>
          </>
        );
      case 'submission':
        return (
          <>
            <ChallengeBlock />
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 34, color: '#FF9933', lineHeight: 1 }}>{submittedCount}/{players.length}</p>
                <p style={label}>Submitted</p>
              </div>
              {room.timerEndsAt && (
                <div>
                  <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 34, color: remaining <= 10 ? '#ef4444' : '#fff', lineHeight: 1 }}>{remaining}</p>
                  <p style={label}>Sec Left</p>
                </div>
              )}
            </div>
            <div style={card}><PlayerRows showStatus /></div>
          </>
        );
      case 'reveal':
        return (
          <div style={card}>
            <p style={{ ...label, marginBottom: 10 }}>Cards played</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.values(room.submissions).map((s) => (
                <div key={s.playerId}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{s.playerName} — <span style={{ color: '#FF9933' }}>{s.schemeCard.name}</span></p>
                  {s.explanation && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 2 }}>&ldquo;{s.explanation}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        );
      case 'judging':
        return <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', padding: '24px 0' }}>The AI judge is deciding the winner…</p>;
      case 'winner':
      case 'between-rounds': {
        const win = verdict && !verdict.noWinner;
        return (
          <>
            {win ? (
              <div style={{ ...card, textAlign: 'center' }}>
                <p style={{ ...label, marginBottom: 10 }}>Round {room.round} Winner</p>
                <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', margin: '0 auto 8px' }}>
                  <Avatar id={verdict!.rankings[0]?.avatarId ?? 'a1'} size={72} />
                </div>
                <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 26, color: '#FFD700' }}>{verdict!.winnerName}</p>
                <p style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{verdict!.schemeCard.name}</p>
                {verdict!.explanation && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginTop: 6 }}>&ldquo;{verdict!.explanation}&rdquo;</p>}
              </div>
            ) : (
              <p style={{ textAlign: 'center', fontFamily: 'var(--font-bebas)', fontSize: 22, color: 'rgba(255,255,255,0.7)' }}>No winner this round</p>
            )}
            <div>
              <p style={{ ...label, marginBottom: 8 }}>Standings</p>
              <LeaderboardRows />
            </div>
          </>
        );
      }
      case 'game-over':
        return (
          <>
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-bebas)', fontSize: 30, color: '#FF9933', letterSpacing: '0.04em' }}>Khel Khatam!</p>
            <div>
              <p style={{ ...label, marginBottom: 8 }}>Final Standings</p>
              <LeaderboardRows />
            </div>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 16px 88px', color: '#fff', fontFamily: 'var(--font-inter),sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={label}>{PHASE_LABEL[room.phase] ?? room.phase}</p>
          {room.phase !== 'lobby' && room.round > 0 && (
            <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 20, marginTop: 2 }}>
              Round <span style={{ color: '#FF9933' }}>{room.round}</span>/{room.totalRounds}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={label}>Room</p>
          <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 24, letterSpacing: '0.15em', color: '#FF9933', lineHeight: 1 }}>{room.code}</p>
        </div>
      </div>
      {content()}
    </div>
  );
}
