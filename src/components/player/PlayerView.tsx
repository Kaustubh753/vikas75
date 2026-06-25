'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import { vibrate } from '@/lib/vibrate';
import ConnectionBanner from '@/components/ui/ConnectionBanner';
import LogoLockup from '@/components/ui/LogoLockup';
import { getMusicManager } from '@/lib/music';
import SkeletonCard from '@/components/ui/SkeletonCard';
import PlayerLobby from '@/components/player/PlayerLobby';
import PlayerChallengeReveal from '@/components/player/PlayerChallengeReveal';
import PlayerSubmit from '@/components/player/PlayerSubmit';
import PlayerWaiting from '@/components/player/PlayerWaiting';
import Avatar from '@/lib/avatars';
import EmotePanel from '@/components/player/EmotePanel';
import ChatPanel from '@/components/player/ChatPanel';
import { getLobbyMusic } from '@/lib/music-manager';
import type { GameRoom, SchemeCard, EmoteId, AvatarId, ChatMessage } from '@/types/game';

interface Props {
  code: string;
}

// Drop a room snapshot that's older than what we already have. A slow poll (GET) can resolve
// after a newer Pusher event and would otherwise revert the phase (e.g. winner → judging).
// Legacy rooms without a rev always apply, preserving prior behaviour.
function staleRoom(prev: GameRoom | null, next: GameRoom): boolean {
  return !!prev && prev.rev != null && next.rev != null && next.rev < prev.rev;
}

const PHASE_BG: Record<string, string> = {
  lobby: '#0d1b35',
  'challenge-reveal': '#1a0d2e',
  submission: '#0d1b35',
  reveal: '#1a2a0d',
  judging: '#0d1b35',
  winner: '#2a1a00',
  'between-rounds': '#0d1b35',
  'game-over': '#1a0d00',
};

type OverlayInfo = { text: string; color: string; initial: { y?: number; x?: number; scale?: number } };

function getOverlay(phase: string, round: number): OverlayInfo | null {
  if (phase === 'challenge-reveal') return { text: `ROUND ${round}`, color: '#FF9933', initial: { y: -60, scale: 1.2 } };
  if (phase === 'submission') return { text: 'ALL IN', color: '#FF9933', initial: { y: 60, scale: 1 } };
  if (phase === 'reveal') return { text: "TIME'S UP", color: '#ef4444', initial: { x: 80, scale: 1 } };
  return null;
}

export default function PlayerView({ code }: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [cachedHand, setCachedHand] = useState<SchemeCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const toastedJoin = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const visibilityNotifiedRef = useRef(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerExpireScheduledRef = useRef(false);

  useEffect(() => {
    const pid = localStorage.getItem('vikas75_playerId') ?? '';
    const pname = localStorage.getItem('vikas75_playerName') ?? '';
    const avid = (localStorage.getItem('vikas75_avatarId') as AvatarId) ?? 'a1';
    if (!pid || !pname) {
      router.replace(`/join?code=${code}`);
      return;
    }
    setPlayerId(pid);
    setPlayerName(pname);
    setAvatarId(avid);
    // Single shared "sound on" preference drives both lobby music and SFX.
    const soundOn = localStorage.getItem('vikas75-sound-on') === 'true';
    setMusicOn(soundOn);
    getMusicManager().setMuted(!soundOn);
    // Restore cached hand from previous session (survives page refresh mid-game)
    try {
      const savedHand = localStorage.getItem(`vikas75_hand_${code}`);
      if (savedHand) setCachedHand(JSON.parse(savedHand));
    } catch { /* ignore */ }
    setHydrated(true);
  }, [code, router]);

  const clearSessionAndGoHome = useCallback((message?: string) => {
    localStorage.removeItem('vikas75_playerId');
    localStorage.removeItem('vikas75_token');
    localStorage.removeItem('vikas75_playerName');
    localStorage.removeItem('vikas75_avatarId');
    localStorage.removeItem('vikas75_roomCode');
    localStorage.removeItem(`vikas75_hand_${code}`);
    if (message) toast(message, { icon: '🏁' });
    router.replace('/');
  }, [router, code]);

  const fetchRoom = useCallback(async () => {
    try {
      const pid = localStorage.getItem('vikas75_playerId') ?? '';
      const tok = localStorage.getItem('vikas75_token') ?? '';
      const res = await fetch(`/api/game?code=${code}${pid ? `&me=${encodeURIComponent(pid)}` : ''}`,
        tok ? { headers: { 'x-player-token': tok } } : undefined);
      if (!res.ok) {
        // 404 = the room is genuinely gone (closed, expired, deleted). Always clear identity
        // and return home cleanly — no error, no dead end — even for an already-joined player.
        // Other errors (e.g. 503 storage blip) are ignored so a transient hiccup doesn't eject
        // an active player; during initial restore any failure still sends them home.
        if (res.status === 404 || !toastedJoin.current) clearSessionAndGoHome();
        return;
      }
      const data = await res.json();
      const r: GameRoom = data.room;
      if (!r) {
        clearSessionAndGoHome();
        return;
      }
      // Rejoining a finished game — redirect with toast
      if (!toastedJoin.current && r.phase === 'game-over') {
        clearSessionAndGoHome('That game has ended. Start a new one!');
        return;
      }
      // Merge messages: deduplicate by id so server's authoritative list wins without dropping local-only messages
      setRoom(prev => {
        if (staleRoom(prev, r)) return prev; // drop a slow poll that resolved after a newer update
        const serverMsgs = r.messages ?? [];
        const localMsgs = prev?.messages ?? [];
        const merged = [...serverMsgs, ...localMsgs.filter(m => !serverMsgs.find(s => s.id === m.id))];
        return { ...r, messages: merged.slice(-20) };
      });
      if (pid && r.players[pid]?.hand?.length) {
        const hand = r.players[pid].hand;
        setCachedHand(hand);
        // Persist so the hand survives a page refresh mid-submission
        try { localStorage.setItem(`vikas75_hand_${code}`, JSON.stringify(hand)); } catch { /* ignore */ }
      }
      if (!toastedJoin.current && pid && r.players[pid]) {
        toast.success('Joined room!');
        toastedJoin.current = true;
      }
    } catch {
      // ignore network errors
    }
  }, [code, clearSessionAndGoHome]);

  useEffect(() => {
    if (hydrated) fetchRoom();
  }, [hydrated, fetchRoom]);

  // Fallback poll for when the Pusher real-time channel is unavailable. Poll fast while a
  // round is in motion so a phase change (round ends → reveal → winner) reaches the player
  // within a few seconds and they never get stuck on their own submission screen; idle
  // phases (lobby / between-rounds / game-over) poll slowly to save load.
  useEffect(() => {
    if (!hydrated) return;
    const active = room?.phase === 'submission' || room?.phase === 'reveal'
      || room?.phase === 'judging' || room?.phase === 'winner';
    // Jitter per client so a large room (which falls back to polling once Pusher's limit is
    // hit) doesn't stampede the API on the same 3s beat — spread the load across the window.
    const base = active ? 3_000 : 30_000;
    const id = setInterval(fetchRoom, base + Math.random() * (active ? 1_500 : 8_000));
    return () => clearInterval(id);
  }, [hydrated, fetchRoom, room?.phase]);

  useEffect(() => {
    if (!hydrated) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));

    const onRoomUpdated = (updated: GameRoom) => {
      setRoom(prev => staleRoom(prev, updated) ? prev : { ...updated, messages: prev?.messages ?? [] });
      // Also sync cachedHand — Pusher payload is the full room, so the hand is here.
      // fetchRoom() does the same thing, but can lose a race when Pusher fires first.
      const pid = localStorage.getItem('vikas75_playerId') ?? '';
      if (pid && updated.players[pid]?.hand?.length) {
        const hand = updated.players[pid].hand;
        setCachedHand(hand);
        try { localStorage.setItem(`vikas75_hand_${code}`, JSON.stringify(hand)); } catch { /* ignore */ }
      }
    };

    const onChat = (msg: ChatMessage) => {
      setRoom(prev => {
        if (!prev) return prev;
        const messages = [...prev.messages.slice(-19), msg];
        return { ...prev, messages };
      });
    };

    channel.bind('game:room-updated', onRoomUpdated);
    channel.bind('game:chat', onChat);

    return () => {
      channel.unbind('game:room-updated', onRoomUpdated);
      channel.unbind('game:chat', onChat);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code, hydrated]);

  // Clean up overlay timer on unmount
  useEffect(() => () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  }, []);

  // Kicked by the host: once we've confirmed we were in the room, our seat vanishing from a
  // fresh room payload (outside the normal game-over flow) means the host removed us. Exit
  // cleanly to home rather than getting stuck on a stale screen.
  useEffect(() => {
    if (!hydrated || !room || !playerId) return;
    if (toastedJoin.current && room.phase !== 'game-over' && !room.players[playerId]) {
      clearSessionAndGoHome('You were removed from the room by the host.');
    }
  }, [room, playerId, hydrated, clearSessionAndGoHome]);

  // Toast + overlay on phase change
  useEffect(() => {
    if (!room) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = room.phase;
    if (prev !== null && prev !== room.phase) {
      if (room.phase === 'challenge-reveal') {
        toast('Round starting...', { icon: '🎯' });
      }
      // Brief overlay text
      const ov = getOverlay(room.phase, room.round);
      if (ov) {
        setOverlay(ov);
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = setTimeout(() => setOverlay(null), 1100);
      }
    }
  }, [room?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hydrated && room?.phase === 'challenge-reveal') {
      fetchRoom();
    }
  }, [hydrated, room?.phase, fetchRoom]);

  const handleSubmit = useCallback(async (card: SchemeCard, explanation: string, auto = false) => {
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          code,
          token: localStorage.getItem('vikas75_token') ?? '',
          auto,
          submission: {
            playerId,
            playerName,
            avatarId,
            schemeCard: card,
            explanation,
            submittedAt: Date.now(),
          },
        }),
      });
      if (!res.ok) {
        // Room vanished mid-game — send the player home cleanly rather than showing an error.
        if (res.status === 404) { clearSessionAndGoHome(); return; }
        // An auto-submit racing the phase advance can legitimately fail (round already moved
        // on) — stay silent rather than alarming the player.
        if (auto) return;
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error || 'Submission failed — please try again');
        return;
      }
      toast.success(auto ? 'Time! Your answer was submitted.' : 'Answer submitted!');
      vibrate(50);
    } catch {
      toast.error('Network error — please check your connection and try again');
    }
  }, [code, playerId, playerName, avatarId, clearSessionAndGoHome]);

  const handleEmote = useCallback(async (emoteId: EmoteId) => {
    vibrate(30);
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'emote',
          code,
          playerId,
          playerName,
          avatarId,
          emote: emoteId,
          token: localStorage.getItem('vikas75_token') ?? '',
        }),
      });
    } catch { /* fire-and-forget — emotes are non-critical */ }
  }, [code, playerId, playerName, avatarId]);

  const handleChat = useCallback(async (text: string) => {
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          code,
          token: localStorage.getItem('vikas75_token') ?? '',
          message: { playerId, playerName, avatarId, text },
        }),
      });
    } catch { /* fire-and-forget — chat is non-critical */ }
  }, [code, playerId, playerName, avatarId]);

  // ── Presence: heartbeat every 20 s + sendBeacon on close ─────────────
  useEffect(() => {
    if (!hydrated || !playerId || !code) return;

    const ping = () => {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'heartbeat', code, playerId, token: localStorage.getItem('vikas75_token') ?? '' }),
        keepalive: true,
      }).catch(() => {});
    };

    ping(); // immediate ping on mount
    const id = setInterval(ping, 20_000);

    // sendBeacon on tab close / navigate away
    const onUnload = () => {
      const blob = new Blob(
        [JSON.stringify({ action: 'heartbeat', code, playerId, token: localStorage.getItem('vikas75_token') ?? '' })],
        { type: 'application/json' }
      );
      navigator.sendBeacon?.('/api/game', blob);
    };

    // visibilitychange: fires reliably on mobile when app is backgrounded
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onUnload();
    };

    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hydrated, playerId, code]);

  // Timer-expire — each player schedules independently; server distributed lock ensures only
  // one actually advances. This means the timer works even without a projector open.
  useEffect(() => {
    if (!room?.timerEndsAt || room.phase !== 'submission') {
      timerExpireScheduledRef.current = false;
      return;
    }
    if (timerExpireScheduledRef.current) return; // already scheduled for this timer
    timerExpireScheduledRef.current = true;
    const delay = room.timerEndsAt - Date.now();
    if (delay <= 0) {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'timer-expire', code }),
        keepalive: true,
      }).catch(() => {});
      return;
    }
    const t = setTimeout(() => {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'timer-expire', code }),
        keepalive: true,
      }).catch(() => {});
    }, delay);
    return () => { clearTimeout(t); timerExpireScheduledRef.current = false; };
  }, [room?.timerEndsAt, room?.phase, code]);

  useEffect(() => {
    if (!room || room.phase === 'game-over') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [room?.phase]);

  useEffect(() => {
    if (!room || room.phase !== 'submission') { visibilityNotifiedRef.current = false; return; }
    const handler = () => {
      if (document.visibilityState !== 'visible' || !room.timerEndsAt) return;
      const remaining = Math.ceil((room.timerEndsAt - Date.now()) / 1000);
      if (remaining > 0 && remaining <= 30 && !visibilityNotifiedRef.current) {
        visibilityNotifiedRef.current = true;
        toast('Hurry! Round is ending soon.', { icon: '⏰' });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [room?.phase, room?.timerEndsAt]);

  if (!hydrated || !room) {
    return (
      <div className="min-h-screen bg-[#0d1b35] flex flex-col gap-4 p-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-32" />
      </div>
    );
  }

  const mySubmission = room.submissions[playerId];
  const phase = room.phase;
  // Show "join next round" screen when:
  // (a) player isn't in room.players yet (navigated directly), or
  // (b) player joined during or after the current round started (joinedRound >= round),
  //     meaning allPlayersSubmitted() won't count them anyway.
  const isMidGameNewPlayer = phase === 'submission' && (
    !room.players[playerId] || room.players[playerId].joinedRound >= room.round
  );

  function renderContent() {
    if (!room) return null;

    if (isMidGameNewPlayer) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-4">
          <p className="text-4xl">🕐</p>
          <p className="text-white font-[family-name:var(--font-bebas)] text-2xl tracking-wide text-center">
            You&apos;ll Play from Next Round
          </p>
          <p className="text-white/50 text-sm text-center font-[family-name:var(--font-inter)]">
            A round is in progress. You&apos;ll get cards and join next round!
          </p>
        </div>
      );
    }

    switch (phase) {
      case 'lobby':
        return <PlayerLobby room={room} playerId={playerId} />;
      case 'challenge-reveal':
        if (room.currentChallenge) {
          return <PlayerChallengeReveal challenge={room.currentChallenge} />;
        }
        return <PlayerWaiting phase={phase} hint="Look at the big screen for the challenge!" />;
      case 'submission':
        if (room.currentChallenge) {
          return (
            <PlayerSubmit
              hand={cachedHand}
              challenge={room.currentChallenge}
              onSubmit={handleSubmit}
              submitted={!!mySubmission}
              submittedCard={mySubmission?.schemeCard}
              submittedExplanation={mySubmission?.explanation}
              timerEndsAt={room.timerEndsAt ?? undefined}
              timerDuration={room.timerDuration}
            />
          );
        }
        return <PlayerWaiting phase={phase} />;
      case 'winner': {
        const verdict = room.lastVerdict;
        if (!verdict) return <PlayerWaiting phase={phase} hint="Revealing the winner on the big screen…" />;
        if (verdict.noWinner) {
          return (
            <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-6 text-center">
              <p className="text-5xl">🤷</p>
              <p className="text-white font-[family-name:var(--font-bebas)] text-3xl tracking-wide">No winner this round</p>
              <p className="text-white/50 text-sm font-[family-name:var(--font-inter)]">{verdict.reasoning}</p>
            </div>
          );
        }
        const iWon = verdict.winnerId === playerId;
        return (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-6 text-center animate-fade-in">
            <p className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-lg tracking-[0.4em] uppercase">
              Round {room.round} Winner
            </p>
            <div className="rounded-2xl overflow-hidden border-2 border-[#FFD700]/60 shadow-[0_0_40px_#FFD70040]">
              <Avatar id={verdict.rankings[0]?.avatarId ?? 'a1'} size={96} className="rounded-2xl" />
            </div>
            <p className="font-[family-name:var(--font-bebas)] text-[#FFD700] text-4xl tracking-wide leading-none">
              {verdict.winnerName}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 max-w-sm">
              <p className="font-[family-name:var(--font-bebas)] text-white text-lg tracking-wide mb-1">
                {verdict.schemeCard.name}
              </p>
              <p className="font-[family-name:var(--font-inter)] text-white/60 text-sm italic">
                &ldquo;{verdict.explanation}&rdquo;
              </p>
            </div>
            <p className={`font-[family-name:var(--font-inter)] text-sm font-semibold ${iWon ? 'text-[#138808]' : 'text-white/50'}`}>
              {iWon ? '🎉 You won this round!' : 'Better luck next round!'}
            </p>
          </div>
        );
      }
      case 'game-over':
        // Clear saved drafts (now scoped per challenge id) so none bleed into the next game
        try {
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('vikas75_draft_explanation')) sessionStorage.removeItem(k);
          }
        } catch { /* ignore */ }
        return (
          <div className="flex flex-col items-center justify-center gap-4 min-h-[50vh] px-4">
            <p className="text-4xl">🎉</p>
            <p className="text-white font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-center">
              Game Over!
            </p>
            <p className="text-white/50 text-sm text-center font-[family-name:var(--font-inter)]">
              Thanks for playing Vikas 75!
            </p>
            <button
              onClick={() => clearSessionAndGoHome()}
              className="mt-4 px-8 h-14 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
            >
              Play Again →
            </button>
            <a
              href="/explore"
              className="flex items-center gap-1.5 font-[family-name:var(--font-inter)] text-xs font-medium tracking-wide transition-colors"
              style={{ color: 'rgba(250,248,240,0.38)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,153,51,0.8)'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.38)'}
            >
              Explore all 75 schemes
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5H8M5.5 2.5L8 5L5.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        );
      default:
        return <PlayerWaiting phase={phase} />;
    }
  }

  const showEmoteAndChat = phase !== 'game-over';

  return (
    <motion.main
      className="min-h-screen flex flex-col relative"
      animate={{ backgroundColor: PHASE_BG[phase] ?? '#0d1b35' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <ConnectionBanner />

      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        {/* Logo may clip its long tagline on narrow phones; the controls below never shrink. */}
        <div className="min-w-0 overflow-hidden">
          <LogoLockup size="sm" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Per-device lobby music toggle — independent, no Pusher */}
          {phase !== 'game-over' && (
            <button
              onClick={() => {
                const next = getLobbyMusic().toggle(); // true = sound on (writes shared key)
                getMusicManager().setMuted(!next);     // SFX follows the same preference
                setMusicOn(next);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: musicOn ? 'rgba(255,153,51,0.18)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${musicOn ? 'rgba(255,153,51,0.5)' : 'rgba(255,255,255,0.15)'}`,
                fontSize: 16,
              }}
              aria-label={musicOn ? 'Mute all sound' : 'Unmute all sound'}
            >
              {musicOn ? '🔊' : '🔇'}
            </button>
          )}
          {phase !== 'lobby' && room.round > 0 && (
            <div className="text-right">
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-[family-name:var(--font-inter)]">
                Round
              </p>
              <p className="font-[family-name:var(--font-bebas)] text-white text-xl">
                {room.round}/{room.totalRounds}
              </p>
            </div>
          )}
          {/* Leave game — clears this session and returns home. (Just navigating home without
              clearing would bounce straight back, since the home page auto-rejoins a stored seat.) */}
          {phase !== 'game-over' && (
            <button
              onClick={() => clearSessionAndGoHome()}
              className="flex items-center gap-1 transition-all active:scale-95"
              style={{
                height: 32,
                paddingLeft: 10,
                paddingRight: 10,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-inter),sans-serif',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              aria-label="Leave game and return to home"
            >
              ← Leave
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      {showEmoteAndChat && (
        <>
          <EmotePanel onEmote={handleEmote} />
          <ChatPanel
            messages={room.messages}
            onSend={handleChat}
            playerId={playerId}
            avatarId={avatarId}
          />
        </>
      )}

      {/* Brief text overlay — "ROUND X", "ALL IN", "TIME'S UP" */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            key={`overlay-${overlay.text}`}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="assertive"
            aria-atomic="true"
          >
            <motion.p
              className="font-[family-name:var(--font-bebas)] tracking-widest text-center"
              style={{
                fontSize: 'min(28vw, 96px)',
                color: overlay.color,
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                lineHeight: 1,
              }}
              initial={{ ...overlay.initial, opacity: 0 }}
              animate={{ y: 0, x: 0, scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {overlay.text}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
