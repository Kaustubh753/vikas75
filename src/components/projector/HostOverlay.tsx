'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { GameRoom, GameMode } from '@/types/game';
import Avatar from '@/lib/avatars';

interface Props {
  room: GameRoom;
  code: string;
  hostId: string;
}

function getAdvanceLabel(room: GameRoom): string {
  switch (room.phase) {
    case 'lobby':            return 'Start Game';
    case 'challenge-reveal': return 'Open Submissions';
    case 'submission':       return 'End Submissions';
    case 'reveal':           return 'Send to Judge';
    case 'winner':
      return room.round < room.totalRounds ? 'Next Round' : 'Final Results';
    case 'between-rounds':   return `Start Round ${room.round + 1}`;
    case 'game-over':        return 'New Game';
    default:                 return 'Advance';
  }
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'lobby':            return 'LOBBY';
    case 'challenge-reveal': return 'CHALLENGE';
    case 'submission':       return 'SUBMISSIONS';
    case 'reveal':           return 'REVEAL';
    case 'judging':          return 'JUDGING';
    case 'winner':           return 'WINNER';
    case 'between-rounds':   return 'BETWEEN ROUNDS';
    case 'game-over':        return 'GAME OVER';
    default:                 return phase.toUpperCase();
  }
}

export default function HostOverlay({ room, code, hostId }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [rounds, setRounds] = useState(room.totalRounds);
  const [timer, setTimer] = useState(room.timerDuration);
  const [mode, setMode] = useState<GameMode>(room.gameMode);
  const settingsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover states for buttons
  const [advanceHover, setAdvanceHover] = useState(false);
  const [collapseHover, setCollapseHover] = useState(false);
  const [settingsHover, setSettingsHover] = useState(false);
  const [musicHover, setMusicHover] = useState(false);
  const [expandHover, setExpandHover] = useState(false);
  const [endGameHover, setEndGameHover] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [playersHover, setPlayersHover] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);

  // Sync sliders when room updates (e.g. from another client)
  useEffect(() => {
    setRounds(room.totalRounds);
    setTimer(room.timerDuration);
    setMode(room.gameMode);
  }, [room.totalRounds, room.timerDuration, room.gameMode]);

  // Close settings panel when leaving lobby
  useEffect(() => {
    if (room.phase !== 'lobby') {
      setShowSettings(false);
    }
  }, [room.phase]);

  // beforeunload warning during active game
  useEffect(() => {
    if (room.phase === 'lobby' || room.phase === 'game-over') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [room.phase]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    };
  }, []);

  async function handleAdvance() {
    if (room.phase === 'game-over') {
      router.push('/');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', code, hostId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not advance');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleMusicToggle() {
    const nextMuted = !musicMuted;
    setMusicMuted(nextMuted);
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'music-toggle', code, hostId, muted: nextMuted }),
      });
    } catch {
      // fire-and-forget
    }
  }

  async function handleEndGame() {
    setShowEndConfirm(false);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end-game', code, hostId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not end game');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  async function handleKick(targetId: string) {
    setKickingId(targetId);
    setError('');
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick-player', code, hostId, playerId: targetId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Could not remove player');
    } catch {
      setError('Network error');
    }
    setKickingId(null);
  }

  const scheduleSettingsUpdate = useCallback((nextRounds: number, nextTimer: number, nextMode: GameMode) => {
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    settingsDebounceRef.current = setTimeout(async () => {
      try {
        await fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: nextRounds, timerDuration: nextTimer, gameMode: nextMode }),
        });
      } catch {
        // non-critical
      }
    }, 400);
  }, [code, hostId]);

  const saveSettings = useCallback(async (nextRounds: number, nextTimer: number, nextMode: GameMode) => {
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: nextRounds, timerDuration: nextTimer, gameMode: nextMode }),
      });
    } catch {
      // non-critical
    }
  }, [code, hostId]);

  function handleSettingsSave() {
    saveSettings(rounds, timer, mode);
  }

  function handleModeChange(nextMode: GameMode) {
    setMode(nextMode);
    saveSettings(rounds, timer, nextMode);
  }

  const playerCount = Object.values(room.players).length;
  const isJudging = room.phase === 'judging';
  const isDisabled = loading || isJudging;

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 72,
    zIndex: 200,
    background: 'rgba(7,16,31,0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(255,153,51,0.22)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    gap: 12,
    transform: collapsed ? 'translateY(100%)' : 'translateY(0)',
    transition: 'transform 0.32s cubic-bezier(.4,0,.2,1)',
    boxSizing: 'border-box',
  };

  const settingsPanelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 72,
    left: 0,
    right: 0,
    zIndex: 199,
    background: 'rgba(7,16,31,0.96)',
    borderTop: '1px solid rgba(255,153,51,0.22)',
    borderLeft: '1px solid rgba(255,153,51,0.10)',
    borderRight: '1px solid rgba(255,153,51,0.10)',
    borderRadius: '12px 12px 0 0',
    padding: '16px 24px',
    display: 'flex',
    gap: 32,
    alignItems: 'flex-start',
    transform: showSettings ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
  };

  const playersPanelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 72,
    left: 0,
    right: 0,
    zIndex: 199,
    background: 'rgba(7,16,31,0.96)',
    borderTop: '1px solid rgba(255,153,51,0.22)',
    borderLeft: '1px solid rgba(255,153,51,0.10)',
    borderRight: '1px solid rgba(255,153,51,0.10)',
    borderRadius: '12px 12px 0 0',
    padding: '14px 24px',
    transform: showPlayers ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.28s cubic-bezier(.4,0,.2,1)',
  };

  const iconBtnStyle = (hovered: boolean): React.CSSProperties => ({
    width: 38,
    height: 38,
    borderRadius: 8,
    background: hovered ? 'rgba(255,153,51,0.18)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${hovered ? 'rgba(255,153,51,0.5)' : 'rgba(255,255,255,0.10)'}`,
    color: hovered ? '#FF9933' : 'rgba(255,255,255,0.6)',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
  });

  return (
    <>
      {/* Settings panel — slides in above bar when in lobby */}
      {room.phase === 'lobby' && (
        <div style={settingsPanelStyle}>
          {/* Rounds slider */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                letterSpacing: '0.1em',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                Rounds
              </span>
              <span style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: 18,
                color: '#FF9933',
                lineHeight: 1,
              }}>
                {rounds}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={15}
              value={rounds}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRounds(v);
                scheduleSettingsUpdate(v, timer, mode);
              }}
              onPointerUp={handleSettingsSave}
              onKeyUp={handleSettingsSave}
              aria-label="Number of rounds"
              style={{ width: '100%', accentColor: '#FF9933', cursor: 'pointer' }}
            />
          </div>

          {/* Timer slider */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                letterSpacing: '0.1em',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
              }}>
                Timer
              </span>
              <span style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: 18,
                color: '#FF9933',
                lineHeight: 1,
              }}>
                {timer}s
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={5}
              value={timer}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTimer(v);
                scheduleSettingsUpdate(rounds, v, mode);
              }}
              onPointerUp={handleSettingsSave}
              onKeyUp={handleSettingsSave}
              aria-label="Timer duration in seconds"
              style={{ width: '100%', accentColor: '#FF9933', cursor: 'pointer' }}
            />
          </div>

          {/* Mode toggle */}
          <div style={{ flex: 1 }}>
            <span style={{
              display: 'block', marginBottom: 6,
              fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.1em',
              fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
            }}>
              Mode
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['crowd', 'Crowd'], ['friends', 'Friends']] as [GameMode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  style={{
                    flex: 1, height: 32, borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600,
                    letterSpacing: '0.04em',
                    background: mode === m ? 'rgba(255,153,51,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${mode === m ? 'rgba(255,153,51,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: mode === m ? '#FF9933' : 'rgba(255,255,255,0.5)',
                    transition: 'background .15s, border-color .15s, color .15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Players panel — manage/kick players; available in any non-finished phase */}
      {room.phase !== 'game-over' && (
        <div style={playersPanelStyle}>
          <span style={{
            display: 'block', marginBottom: 10,
            fontFamily: 'var(--font-inter)', fontSize: 10, letterSpacing: '0.1em',
            fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
          }}>
            Players · {playerCount}
          </span>
          {playerCount === 0 ? (
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              No players have joined yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
              {Object.values(room.players).map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                    <Avatar id={p.avatarId} size={28} />
                  </div>
                  <span style={{
                    flex: 1, fontFamily: 'var(--font-inter)', fontSize: 13, fontWeight: 500,
                    color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                    {p.score}
                  </span>
                  <button
                    onClick={() => handleKick(p.id)}
                    disabled={kickingId === p.id}
                    title={`Remove ${p.name}`}
                    aria-label={`Remove ${p.name}`}
                    style={{
                      height: 28, paddingLeft: 12, paddingRight: 12, borderRadius: 7,
                      background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)',
                      color: '#ef4444', fontFamily: 'var(--font-inter)', fontSize: 11, fontWeight: 600,
                      letterSpacing: '0.04em', cursor: kickingId === p.id ? 'not-allowed' : 'pointer',
                      opacity: kickingId === p.id ? 0.5 : 1, flexShrink: 0,
                      transition: 'background .15s, opacity .15s',
                    }}
                  >
                    {kickingId === p.id ? '…' : 'Kick'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main bar */}
      <div style={barStyle}>
        {/* LEFT ZONE */}
        <div style={{ minWidth: 220, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* HOST badge */}
            <span style={{
              background: 'rgba(255,153,51,0.12)',
              border: '1px solid rgba(255,153,51,0.35)',
              borderRadius: 20,
              padding: '2px 8px',
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              fontWeight: 700,
              color: '#FF9933',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              HOST
            </span>
            {/* Phase label */}
            <span style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {getPhaseLabel(room.phase)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Round counter — hidden in lobby (round is 0 there) */}
            {room.phase !== 'lobby' && room.round > 0 && (
              <span style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: 16,
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.04em',
              }}>
                Round{' '}
                <span style={{ color: '#FF9933' }}>{room.round}</span>
                /{room.totalRounds}
              </span>
            )}
            {/* Player count */}
            <span style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
            }}>
              · {playerCount} player{playerCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Error text */}
          {error && (
            <span style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 10,
              color: '#ef4444',
              lineHeight: 1.2,
            }}>
              {error}
            </span>
          )}
        </div>

        {/* CENTER ZONE */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isJudging ? (
            /* Pulsing AI judging indicator */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FF9933',
                display: 'inline-block',
                animation: 'hostOverlayPulse 1.2s ease-in-out infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.45)',
                fontWeight: 500,
                letterSpacing: '0.04em',
              }}>
                AI Judging…
              </span>
            </div>
          ) : (
            /* Advance button */
            <button
              onClick={handleAdvance}
              disabled={isDisabled}
              onMouseEnter={() => setAdvanceHover(true)}
              onMouseLeave={() => setAdvanceHover(false)}
              style={{
                height: 44,
                minWidth: 200,
                paddingLeft: 28,
                paddingRight: 28,
                borderRadius: 22,
                background: advanceHover && !isDisabled ? '#e8872a' : '#FF9933',
                border: 'none',
                color: '#07101f',
                fontFamily: 'var(--font-bebas)',
                fontSize: 22,
                letterSpacing: '0.08em',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                outline: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Working…' : getAdvanceLabel(room)}
            </button>
          )}
        </div>

        {/* RIGHT ZONE */}
        <div style={{ minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {/* End Game — available in any non-finished phase */}
          {room.phase !== 'game-over' && (
            <button
              onClick={() => setShowEndConfirm(true)}
              onMouseEnter={() => setEndGameHover(true)}
              onMouseLeave={() => setEndGameHover(false)}
              title="End game now"
              disabled={loading}
              style={{
                ...iconBtnStyle(endGameHover),
                color: endGameHover ? '#ef4444' : 'rgba(255,255,255,0.4)',
                border: `1px solid ${endGameHover ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
                background: endGameHover ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)',
              }}
              aria-label="End game"
            >
              ✕
            </button>
          )}

          {/* Players manager — kick players; any non-finished phase */}
          {room.phase !== 'game-over' && (
            <button
              onClick={() => { setShowPlayers((p) => !p); setShowSettings(false); }}
              onMouseEnter={() => setPlayersHover(true)}
              onMouseLeave={() => setPlayersHover(false)}
              title="Manage players"
              style={iconBtnStyle(playersHover || showPlayers)}
              aria-label="Manage players"
            >
              👥
            </button>
          )}

          {/* Settings gear — lobby only */}
          {room.phase === 'lobby' && (
            <button
              onClick={() => { setShowSettings((p) => !p); setShowPlayers(false); }}
              onMouseEnter={() => setSettingsHover(true)}
              onMouseLeave={() => setSettingsHover(false)}
              title="Settings"
              style={iconBtnStyle(settingsHover || showSettings)}
              aria-label="Toggle settings"
            >
              ⚙
            </button>
          )}

          {/* Music toggle */}
          <button
            onClick={handleMusicToggle}
            onMouseEnter={() => setMusicHover(true)}
            onMouseLeave={() => setMusicHover(false)}
            title={musicMuted ? 'Unmute projector music' : 'Mute projector music'}
            style={iconBtnStyle(musicHover)}
            aria-label={musicMuted ? 'Unmute projector music' : 'Mute projector music'}
          >
            {musicMuted ? '🔇' : '🔊'}
          </button>

          {/* Collapse chevron */}
          <button
            onClick={() => setCollapsed(true)}
            onMouseEnter={() => setCollapseHover(true)}
            onMouseLeave={() => setCollapseHover(false)}
            title="Collapse controls"
            style={iconBtnStyle(collapseHover)}
            aria-label="Collapse host controls"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Expand pill — visible when collapsed */}
      <button
        onClick={() => setCollapsed(false)}
        onMouseEnter={() => setExpandHover(true)}
        onMouseLeave={() => setExpandHover(false)}
        aria-label="Expand host controls"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 20,
          zIndex: 201,
          height: 36,
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: 18,
          background: expandHover ? 'rgba(255,153,51,0.22)' : 'rgba(7,16,31,0.92)',
          border: '1px solid rgba(255,153,51,0.45)',
          color: '#FF9933',
          fontFamily: 'var(--font-bebas)',
          fontSize: 14,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background 0.15s, opacity 0.32s, transform 0.32s cubic-bezier(.4,0,.2,1)',
          opacity: collapsed ? 1 : 0,
          transform: collapsed ? 'translateY(0)' : 'translateY(16px)',
          pointerEvents: collapsed ? 'auto' : 'none',
          whiteSpace: 'nowrap',
        }}
      >
        HOST ▲
      </button>

      {/* End-game confirmation modal */}
      {showEndConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(7,16,31,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(7,16,31,0.98)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 16,
            padding: '32px 36px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            maxWidth: 400,
          }}>
            <p style={{ fontFamily: 'var(--font-bebas)', fontSize: 28, color: '#fff', letterSpacing: '0.06em', textAlign: 'center' }}>
              End the game?
            </p>
            <p style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.5 }}>
              This will end the game immediately for all players. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  height: 40, paddingLeft: 20, paddingRight: 20, borderRadius: 8,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-inter)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEndGame}
                style={{
                  height: 40, paddingLeft: 20, paddingRight: 20, borderRadius: 8,
                  background: '#ef4444', border: 'none',
                  color: '#fff', fontFamily: 'var(--font-bebas)',
                  fontSize: 18, letterSpacing: '0.06em', cursor: 'pointer',
                }}
              >
                End Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe injection for pulse animation */}
      <style>{`
        @keyframes hostOverlayPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </>
  );
}
