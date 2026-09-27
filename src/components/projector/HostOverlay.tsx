'use client';
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { GameRoom } from '@/types/game';
import Avatar from '@/lib/avatars';
import { getLobbyMusic } from '@/lib/music-manager';
import { getMusicManager } from '@/lib/music';

interface Props {
  room: GameRoom;
  code: string;
  hostId: string;
}

const INTER = 'var(--font-inter)';
const BEBAS = 'var(--font-bebas)';
const HOUSE_70 = 'rgba(250,248,240,0.7)';
const HOUSE_45 = 'rgba(250,248,240,0.45)';
const HAIRLINE = 'rgba(250,248,240,0.14)';
const CHROME = 'rgba(8,7,15,0.92)';
const CHROME_PANEL = 'rgba(8,7,15,0.96)';
const MIN_PLAYERS = 2;

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
    case 'lobby':            return 'Lobby';
    case 'challenge-reveal': return 'Challenge';
    case 'submission':       return 'Submissions';
    case 'reveal':           return 'Reveal';
    case 'judging':          return 'Judging';
    case 'winner':           return 'Winner';
    case 'between-rounds':   return 'Between rounds';
    case 'game-over':        return 'Game over';
    default:                 return phase;
  }
}

type GlyphName = 'invite' | 'players' | 'settings' | 'sound' | 'muted' | 'hide' | 'end';

// Browser-only values read without an effect: the server snapshot is empty, the client's is live.
const subscribeNoop = () => () => {};

/** Stroke icons in currentColor, so the bar's glyphs are drawn, not emoji. */
function Glyph({ name, size }: { name: GlyphName; size: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
  };
  switch (name) {
    case 'players':  return <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5a5 5 0 0 1 5.5 4.5" /></svg>;
    case 'settings': return <svg {...common}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.5" /><circle cx="9" cy="17" r="2.5" /></svg>;
    case 'sound':    return <svg {...common}><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" /><path d="M16.5 9a4.5 4.5 0 0 1 0 6" /><path d="M19 6.5a8 8 0 0 1 0 11" /></svg>;
    case 'muted':    return <svg {...common}><path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" /><path d="M17 9.5l5 5M22 9.5l-5 5" /></svg>;
    case 'hide':     return <svg {...common}><path d="M6 9l6 6 6-6" /></svg>;
    case 'invite':   return <svg {...common}><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
    case 'end':      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
  }
}

/** A labelled 44px control for the bar: glyph on top, tape label under it. */
function BarButton({
  glyph, label, onClick, active, pressed, danger, narrow, disabled, title,
}: {
  glyph: GlyphName; label: string; onClick: () => void;
  active?: boolean; pressed?: boolean; danger?: boolean; narrow: boolean; disabled?: boolean; title?: string;
}) {
  const [hover, setHover] = useState(false);
  const lit = hover || active;
  const tint = danger ? '239,68,68' : '255,153,51';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      aria-pressed={pressed ?? active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minWidth: narrow ? 44 : 66, height: 44, padding: narrow ? '0 6px' : '0 10px',
        borderRadius: 8,
        background: lit ? `rgba(${tint},0.16)` : 'rgba(250,248,240,0.05)',
        border: `1px solid ${lit ? `rgba(${tint},0.5)` : HAIRLINE}`,
        color: lit ? (danger ? '#ef4444' : '#FF9933') : HOUSE_70,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        flexShrink: 0,
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
      }}
    >
      <Glyph name={glyph} size={narrow ? 17 : 18} />
      {!narrow && (
        <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
          {label}
        </span>
      )}
    </button>
  );
}

export default function HostOverlay({ room, code, hostId }: Props) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [musicMuted, setMusicMuted] = useState(true);
  const [rounds, setRounds] = useState(room.totalRounds);
  const [timer, setTimer] = useState(room.timerDuration);
  const [savedTick, setSavedTick] = useState(0);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [hoverRowId, setHoverRowId] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [advanceHover, setAdvanceHover] = useState(false);
  const [expandHover, setExpandHover] = useState(false);
  const settingsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Narrow screens (a host running the game from their phone): the control bar must shrink
  // its zones and buttons so the advance button and the right-hand controls stay on-screen.
  const [isNarrow, setIsNarrow] = useState(false);
  // Under 1000px the labels come off the controls (glyph-only 44px squares) so seven controls,
  // the pill and the HOST chip still share one row on a tablet or a half-width laptop window.
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 640px)');
    const compact = window.matchMedia('(max-width: 1000px)');
    const update = () => { setIsNarrow(narrow.matches); setIsCompact(compact.matches); };
    update();
    narrow.addEventListener('change', update);
    compact.addEventListener('change', update);
    return () => { narrow.removeEventListener('change', update); compact.removeEventListener('change', update); };
  }, []);
  // Bar height plus the device safe-area inset — the body's global safe-area padding doesn't
  // reach fixed elements, so without this the bar sits under the home indicator on notched phones.
  // Phones get two rows (the pill full width above the seven controls): one row left a 28px pill.
  const barH = isNarrow ? 104 : 72;
  const barBox = `calc(${barH}px + env(safe-area-inset-bottom))`;

  // Host toasts land bottom-right, just above the bar that caused them, not top-centre of the shared screen.
  const notify = useCallback((msg: string, kind: 'error' | 'success' = 'error') => {
    const opts = { position: 'bottom-right' as const, style: { marginBottom: barH + 12 } };
    return kind === 'error' ? toast.error(msg, opts) : toast.success(msg, opts);
  }, [barH]);

  // One sound preference drives the icon, the SFX manager and the lobby music.
  useEffect(() => {
    const soundOn = localStorage.getItem('vikas75-sound-on') === 'true';
    setMusicMuted(!soundOn);
  }, []);

  // Sync sliders when room updates (e.g. from another client)
  useEffect(() => {
    setRounds(room.totalRounds);
    setTimer(room.timerDuration);
  }, [room.totalRounds, room.timerDuration]);

  // Close settings panel when leaving lobby
  useEffect(() => {
    if (room.phase !== 'lobby') setShowSettings(false);
  }, [room.phase]);

  // Escape closes whatever the host opened last: the End dialog, then a panel.
  useEffect(() => {
    if (!showEndConfirm && !showPlayers && !showSettings && !showInvite) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showEndConfirm) setShowEndConfirm(false);
      else { setShowPlayers(false); setShowSettings(false); setShowInvite(false); setConfirmKickId(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showEndConfirm, showPlayers, showSettings, showInvite]);

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

  useEffect(() => () => {
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const playerCount = Object.values(room.players).length;
  const isJudging = room.phase === 'judging';

  // The invite link: the same /join?code= deep link the projector's QR encodes. A WhatsApp group
  // is how most rooms fill up, so the link is one tap to copy, share or post.
  const origin = useSyncExternalStore(subscribeNoop, () => window.location.origin, () => '');
  const canShare = useSyncExternalStore(subscribeNoop, () => typeof navigator.share === 'function', () => false);
  const joinLink = `${origin}/join?code=${code}`;
  const inviteText = `Join my Vikas 75 game · room code ${code} · ${joinLink}`;
  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(joinLink);
      notify('Link copied', 'success');
    } catch {
      notify('Could not copy. Select the link and copy it.');
    }
  }
  async function handleShareLink() {
    try {
      await navigator.share({ title: 'Vikas 75', text: `Join my Vikas 75 game · room code ${code}`, url: joinLink });
    } catch {
      // the share sheet was dismissed
    }
  }
  const needPlayers = room.phase === 'lobby' && playerCount < MIN_PLAYERS;
  const isDisabled = loading || isJudging || needPlayers;

  async function handleAdvance() {
    if (room.phase === 'game-over') {
      router.push('/');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', code, hostId }),
      });
      const data = await res.json();
      if (!res.ok) notify(res.status === 403 ? 'This tab is not the host. Use the host link to run the game.' : (data.error || 'Could not advance. Try again.'));
    } catch {
      notify('Network error. Check the connection and try again.');
    }
    setLoading(false);
  }

  async function handleMusicToggle() {
    const nextMuted = !musicMuted;
    setMusicMuted(nextMuted);
    // Local first (this laptop is usually the projector), then tell any other display.
    getMusicManager().setMuted(nextMuted);
    getLobbyMusic().forceMute(nextMuted);
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
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end-game', code, hostId }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Could not end the game. Try again.');
    } catch {
      notify('Network error. Check the connection and try again.');
    }
    setLoading(false);
  }

  async function handleKick(targetId: string, targetName: string) {
    setKickingId(targetId);
    setConfirmKickId(null);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick-player', code, hostId, playerId: targetId }),
      });
      const data = await res.json();
      if (!res.ok) notify(data.error || 'Could not remove player. Try again.');
      else notify(`${targetName} removed`, 'success');
    } catch {
      notify('Network error. Check the connection and try again.');
    }
    setKickingId(null);
  }

  const markSaved = useCallback(() => {
    setSavedTick(Date.now());
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedTick(0), 1600);
  }, []);

  const saveSettings = useCallback(async (nextRounds: number, nextTimer: number) => {
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-settings', code, hostId, totalRounds: nextRounds, timerDuration: nextTimer }),
      });
      if (res.ok) markSaved();
      else notify('Settings not saved. Move the slider again.');
    } catch {
      notify('Settings not saved. Move the slider again.');
    }
  }, [code, hostId, markSaved, notify]);

  const scheduleSettingsUpdate = useCallback((nextRounds: number, nextTimer: number) => {
    if (settingsDebounceRef.current) clearTimeout(settingsDebounceRef.current);
    settingsDebounceRef.current = setTimeout(() => { void saveSettings(nextRounds, nextTimer); }, 400);
  }, [saveSettings]);

  const barStyle: React.CSSProperties = {
    position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%',
    height: barBox, paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 200,
    background: CHROME,
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(255,153,51,0.22)',
    // Wide: three grid columns with equal, flexible sides — the advance pill lands on the
    // screen's true centre line, under the card. As a flex row the side zones sized to their own
    // content, so the "centre" was only the middle of the leftover space. Narrow: two rows.
    ...(isNarrow
      ? { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 8px 4px' }
      : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', paddingLeft: 20, paddingRight: 20, gap: 12 }),
    transform: collapsed ? 'translateY(100%)' : 'translateY(0)',
    transition: 'transform 0.32s cubic-bezier(.4,0,.2,1)',
    boxSizing: 'border-box',
  };

  // Panels are right-hand drawers above the bar, narrow enough never to cover the join card in
  // the centre of the lobby, so a host fixing one player does not stop the rest from scanning.
  const panelStyle = (open: boolean): React.CSSProperties => ({
    position: 'fixed', bottom: `calc(${barH + 10}px + env(safe-area-inset-bottom))`, right: isNarrow ? 8 : 16, zIndex: 199,
    width: isNarrow ? 'calc(100vw - 16px)' : 'min(380px, 22vw)', boxSizing: 'border-box',
    background: CHROME_PANEL,
    border: '1px solid rgba(255,153,51,0.22)',
    borderRadius: 12,
    padding: '16px 20px',
    transform: open ? 'translateY(0)' : 'translateY(12px)',
    opacity: open ? 1 : 0,
    transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), opacity 0.18s',
    visibility: open ? 'visible' : 'hidden',
  });

  const label: React.CSSProperties = {
    fontFamily: INTER, fontSize: 11, letterSpacing: '0.14em', fontWeight: 600,
    color: HOUSE_70, textTransform: 'uppercase',
  };

  // Outlined saffron: the Advance pill keeps the one filled saffron on this screen.
  const inviteBtn: React.CSSProperties = {
    height: 44, padding: '0 16px', borderRadius: 6,
    background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.5)', color: '#FF9933',
    fontFamily: INTER, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap',
  };

  const advanceLabel = loading ? 'Working…' : needPlayers ? `Need ${MIN_PLAYERS} players to start` : getAdvanceLabel(room);
  const showSaved = savedTick > 0;

  const leftZone = (
    <>
        {/* LEFT ZONE — who you are, where the game is */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', overflow: 'hidden', flexShrink: isNarrow ? 0 : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.35)', borderRadius: 20,
              padding: '2px 8px', fontFamily: INTER, fontSize: 11, fontWeight: 700, color: '#FF9933',
              letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              Host
            </span>
            <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 600, color: HOUSE_70, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {getPhaseLabel(room.phase)}
            </span>
          </div>
          <div style={{ fontFamily: INTER, fontSize: 12, color: HOUSE_70, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {room.phase === 'lobby' || room.round === 0 ? (
              <>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{playerCount}</span> player{playerCount !== 1 ? 's' : ''}
                <span style={{ color: HOUSE_45 }}> · </span>{room.totalRounds} rounds
                <span style={{ color: HOUSE_45 }}> · </span>{room.timerDuration}s
              </>
            ) : (
              <>
                Round <span style={{ color: '#FF9933', fontWeight: 700 }}>{room.round}</span>/{room.totalRounds}
                <span style={{ color: HOUSE_45 }}> · </span>{playerCount} player{playerCount !== 1 ? 's' : ''}
              </>
            )}
          </div>
        </div>
    </>
  );
  const centerZone = (
    <>
        {/* CENTER ZONE — the one big control */}
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isJudging ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9933', display: 'inline-block', animation: 'hostOverlayPulse 1.2s ease-in-out infinite' }} />
              <span style={{ fontFamily: INTER, fontSize: 13, color: HOUSE_70, fontWeight: 500, letterSpacing: '0.04em' }}>AI judging…</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              onMouseEnter={() => setAdvanceHover(true)}
              onMouseLeave={() => setAdvanceHover(false)}
              title={needPlayers ? `At least ${MIN_PLAYERS} players are needed to start` : undefined}
              style={{
                height: isNarrow ? 40 : 44,
                minWidth: isNarrow ? 0 : 200, width: isNarrow ? '100%' : undefined,
                paddingLeft: isNarrow ? 14 : 28, paddingRight: isNarrow ? 14 : 28,
                borderRadius: 22,
                background: advanceHover && !isDisabled ? '#e8872a' : '#FF9933',
                border: 'none', color: '#08070f',
                fontFamily: BEBAS, fontSize: isNarrow ? 15 : 22, letterSpacing: '0.08em',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.82 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                outline: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {advanceLabel}
            </button>
          )}
        </div>
    </>
  );
  const rightZone = (
    <>
        {/* RIGHT ZONE — labelled controls; End sits apart at the far right */}
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: isNarrow ? 'space-between' : 'flex-end', gap: isNarrow ? 4 : 6, width: isNarrow ? '100%' : undefined }}>
          {room.phase !== 'game-over' && (
            <BarButton glyph="invite" label="Invite" narrow={isCompact} active={showInvite} onClick={() => { setShowInvite((p) => !p); setShowPlayers(false); setShowSettings(false); }} title="Share the join link" />
          )}
          {room.phase !== 'game-over' && (
            <BarButton glyph="players" label="Players" narrow={isCompact} active={showPlayers} onClick={() => { setShowPlayers((p) => !p); setShowSettings(false); setShowInvite(false); }} />
          )}
          {room.phase === 'lobby' && (
            <BarButton glyph="settings" label="Settings" narrow={isCompact} active={showSettings} onClick={() => { setShowSettings((p) => !p); setShowPlayers(false); setShowInvite(false); }} />
          )}
          <BarButton glyph={musicMuted ? 'muted' : 'sound'} label="Sound" pressed={!musicMuted} narrow={isCompact} onClick={handleMusicToggle} title={musicMuted ? 'Turn sound on' : 'Turn sound off'} />
          <BarButton glyph="hide" label="Hide" narrow={isCompact} onClick={() => setCollapsed(true)} title="Hide host controls" />
          {room.phase !== 'game-over' && (
            <>
              <span aria-hidden="true" style={{ width: 1, height: 28, background: HAIRLINE, margin: isNarrow ? '0 2px' : '0 6px' }} />
              <BarButton glyph="end" label="End" narrow={isCompact} danger disabled={loading} onClick={() => setShowEndConfirm(true)} title="End the game now" />
            </>
          )}
        </div>
    </>
  );

  return (
    <>
      {/* Settings panel — slides in above bar when in lobby */}
      {room.phase === 'lobby' && (
        <div style={{ ...panelStyle(showSettings), display: 'flex', flexDirection: 'column', gap: 16 }} aria-hidden={!showSettings}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={label}>Rounds</span>
              <span style={{ fontFamily: BEBAS, fontSize: 20, color: '#FF9933', lineHeight: 1 }}>{rounds}</span>
            </div>
            <input
              type="range" min={1} max={15} value={rounds}
              onChange={(e) => { const v = Number(e.target.value); setRounds(v); scheduleSettingsUpdate(v, timer); }}
              onPointerUp={() => { void saveSettings(rounds, timer); }}
              onKeyUp={() => { void saveSettings(rounds, timer); }}
              aria-label="Number of rounds"
              style={{ width: '100%', accentColor: '#FF9933', cursor: 'pointer' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={label}>Timer</span>
              <span style={{ fontFamily: BEBAS, fontSize: 20, color: '#FF9933', lineHeight: 1 }}>{timer}s</span>
            </div>
            <input
              type="range" min={30} max={120} step={5} value={timer}
              onChange={(e) => { const v = Number(e.target.value); setTimer(v); scheduleSettingsUpdate(rounds, v); }}
              onPointerUp={() => { void saveSettings(rounds, timer); }}
              onKeyUp={() => { void saveSettings(rounds, timer); }}
              aria-label="Timer duration in seconds"
              style={{ width: '100%', accentColor: '#FF9933', cursor: 'pointer' }}
            />
          </div>

          <div aria-live="polite" style={{ alignSelf: 'flex-end', minHeight: 14, fontFamily: INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#85c47d', opacity: showSaved ? 1 : 0, transition: 'opacity 0.2s' }}>
            Saved ✓
          </div>
        </div>
      )}

      {/* Invite drawer — the join link for a WhatsApp group or a copy-paste; joining stays open until the game ends */}
      {room.phase !== 'game-over' && (
        <div style={panelStyle(showInvite)} aria-hidden={!showInvite}>
          <span style={{ ...label, display: 'block', marginBottom: 6 }}>Invite players</span>
          <p style={{ fontFamily: INTER, fontSize: 13, color: HOUSE_70, margin: '0 0 12px', lineHeight: 1.45 }}>
            Anyone with this link lands on the join page with the code filled in.
          </p>
          <div style={{
            padding: '10px 12px', borderRadius: 6, marginBottom: 12,
            border: `1px solid ${HAIRLINE}`, background: 'rgba(250,248,240,0.04)',
            fontFamily: INTER, fontSize: 13, fontWeight: 600, color: '#ffffff', wordBreak: 'break-all', userSelect: 'all',
          }}>
            {joinLink.replace(/^https?:\/\//, '')}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleCopyLink} style={inviteBtn}>Copy link</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer" style={{ ...inviteBtn, textDecoration: 'none' }}>WhatsApp</a>
            {canShare && <button type="button" onClick={handleShareLink} style={inviteBtn}>Share…</button>}
          </div>
        </div>
      )}

      {/* Players panel — manage/remove players; available in any non-finished phase */}
      {room.phase !== 'game-over' && (
        <div style={panelStyle(showPlayers)} aria-hidden={!showPlayers}>
          <span style={{ ...label, display: 'block', marginBottom: 10 }}>Players · {playerCount}</span>
          {playerCount === 0 ? (
            <p style={{ fontFamily: INTER, fontSize: 13, color: HOUSE_45, margin: 0 }}>No players have joined yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 'min(50vh, 420px)', overflowY: 'auto' }}>
              {Object.values(room.players).map((p) => {
                const confirming = confirmKickId === p.id;
                const busy = kickingId === p.id;
                const lit = hoverRowId === p.id || confirming;
                return (
                  <div
                    key={p.id}
                    onMouseEnter={() => setHoverRowId(p.id)}
                    onMouseLeave={() => setHoverRowId(null)}
                    style={{
                      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '6px 10px', borderRadius: 8,
                      background: lit ? 'rgba(250,248,240,0.05)' : 'transparent', transition: 'background 0.12s',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                      <Avatar id={p.avatarId} size={32} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-inter),var(--font-devanagari),sans-serif', fontSize: 14, fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {p.name}
                    </span>
                    {room.phase !== 'lobby' && <span style={{ fontFamily: BEBAS, fontSize: 15, color: HOUSE_45, letterSpacing: '0.06em', flexShrink: 0 }}>{p.score} pts</span>}
                    {confirming ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexBasis: '100%', paddingTop: 2 }}>
                        <span style={{ fontFamily: INTER, fontSize: 12, color: HOUSE_70, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>Remove {p.name}?</span>
                        <button
                          type="button" onClick={() => setConfirmKickId(null)} autoFocus
                          style={{ height: 36, padding: '0 12px', borderRadius: 6, background: 'rgba(250,248,240,0.06)', border: `1px solid ${HAIRLINE}`, color: '#ffffff', fontFamily: INTER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Keep
                        </button>
                        <button
                          type="button" onClick={() => handleKick(p.id, p.name)}
                          style={{ height: 36, padding: '0 12px', borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.6)', color: '#ef4444', fontFamily: INTER, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Yes, remove
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmKickId(p.id)}
                        disabled={busy}
                        aria-label={`Remove ${p.name}`}
                        style={{
                          height: 36, padding: '0 12px', borderRadius: 6, marginLeft: 4,
                          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.4)',
                          color: '#ef4444', fontFamily: INTER, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
                          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : lit ? 1 : 0.7, flexShrink: 0,
                          transition: 'opacity .15s',
                        }}
                      >
                        {busy ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main bar */}
      <div style={barStyle}>
        {isNarrow ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {leftZone}
              <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>{centerZone}</div>
            </div>
            {rightZone}
          </>
        ) : (
          <>
            {leftZone}
            {centerZone}
            {rightZone}
          </>
        )}
      </div>

      {/* Expand pill — visible when collapsed */}
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        onMouseEnter={() => setExpandHover(true)}
        onMouseLeave={() => setExpandHover(false)}
        aria-label="Show host controls"
        aria-hidden={!collapsed}
        tabIndex={collapsed ? 0 : -1}
        style={{
          position: 'fixed', bottom: 'calc(16px + env(safe-area-inset-bottom))', right: 20, zIndex: 201,
          height: 40, paddingLeft: 16, paddingRight: 16, borderRadius: 20,
          background: expandHover ? 'rgba(255,153,51,0.22)' : CHROME,
          border: '1px solid rgba(255,153,51,0.45)', color: '#FF9933',
          fontFamily: BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
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
        <div role="dialog" aria-modal="true" aria-labelledby="end-game-title" style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(8,7,15,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(8,7,15,0.98)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16,
            padding: '32px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 400,
          }}>
            <p id="end-game-title" style={{ fontFamily: BEBAS, fontSize: 28, color: '#ffffff', letterSpacing: '0.06em', textAlign: 'center', margin: 0 }}>
              End the game?
            </p>
            <p style={{ fontFamily: INTER, fontSize: 13, color: HOUSE_70, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              This ends the game immediately for every player and shows the final standings. It cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button" onClick={() => setShowEndConfirm(false)} autoFocus
                style={{ height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 8, background: 'rgba(250,248,240,0.06)', border: `1px solid ${HAIRLINE}`, color: HOUSE_70, fontFamily: INTER, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Keep playing
              </button>
              <button
                type="button" onClick={handleEndGame}
                style={{ height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 8, background: '#ef4444', border: 'none', color: '#ffffff', fontFamily: BEBAS, fontSize: 18, letterSpacing: '0.06em', cursor: 'pointer' }}
              >
                End game
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hostOverlayPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </>
  );
}
