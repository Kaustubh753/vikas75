'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import { vibrate } from '@/lib/vibrate';
import ConnectionBanner from '@/components/ui/ConnectionBanner';
import MuteButton from '@/components/ui/MuteButton';
import LogoLockup from '@/components/ui/LogoLockup';
import SkeletonCard from '@/components/ui/SkeletonCard';
import PlayerLobby from '@/components/player/PlayerLobby';
import PlayerChallengeReveal from '@/components/player/PlayerChallengeReveal';
import PlayerSubmit from '@/components/player/PlayerSubmit';
import PlayerWaiting from '@/components/player/PlayerWaiting';
import EmotePanel from '@/components/player/EmotePanel';
import ChatPanel from '@/components/player/ChatPanel';
import type { GameRoom, SchemeCard, EmoteId, AvatarId, ChatMessage } from '@/types/game';

interface Props {
  code: string;
}

const PHASE_BG: Record<string, string> = {
  lobby: '#0d1b35',
  'challenge-reveal': '#1a0d2e',
  submission: '#0d1b35',
  reveal: '#1a2a0d',
  judging: '#0d1b2e',
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
  const toastedJoin = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);
  const visibilityNotifiedRef = useRef(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const pid = localStorage.getItem('vikas75_playerId') ?? '';
    const pname = localStorage.getItem('vikas75_playerName') ?? '';
    const avid = (localStorage.getItem('vikas75_avatarId') as AvatarId) ?? 'a1';
    if (!pid || !pname) {
      router.replace(`/?code=${code}`);
      return;
    }
    setPlayerId(pid);
    setPlayerName(pname);
    setAvatarId(avid);
    // Restore cached hand from previous session (survives page refresh mid-game)
    try {
      const savedHand = localStorage.getItem(`vikas75_hand_${code}`);
      if (savedHand) setCachedHand(JSON.parse(savedHand));
    } catch { /* ignore */ }
    setHydrated(true);
  }, [code, router]);

  const clearSessionAndGoHome = useCallback((message?: string) => {
    localStorage.removeItem('vikas75_playerId');
    localStorage.removeItem('vikas75_playerName');
    localStorage.removeItem('vikas75_avatarId');
    localStorage.removeItem('vikas75_roomCode');
    localStorage.removeItem(`vikas75_hand_${code}`);
    if (message) toast(message, { icon: '🏁' });
    router.replace('/');
  }, [router, code]);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/game?code=${code}`);
      if (!res.ok) {
        // Room not found — only clear + redirect during session restore (before first successful join)
        if (!toastedJoin.current) clearSessionAndGoHome();
        return;
      }
      const data = await res.json();
      const r: GameRoom = data.room;
      if (!r) {
        if (!toastedJoin.current) clearSessionAndGoHome();
        return;
      }
      // Rejoining a finished game — redirect with toast
      if (!toastedJoin.current && r.phase === 'game-over') {
        clearSessionAndGoHome('That game has ended. Start a new one!');
        return;
      }
      // Merge messages: keep any locally-accumulated chat not yet in the server snapshot
      setRoom(prev => ({ ...r, messages: prev?.messages?.length ? prev.messages : (r.messages ?? []) }));
      const pid = localStorage.getItem('vikas75_playerId') ?? '';
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

  useEffect(() => {
    if (!hydrated) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));

    const onRoomUpdated = (updated: GameRoom) => {
      setRoom(prev => ({ ...updated, messages: prev?.messages ?? [] }));
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

  async function handleSubmit(card: SchemeCard, explanation: string) {
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          code,
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
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string }).error || 'Submission failed — please try again');
        return;
      }
      toast.success('Answer submitted!');
      vibrate(50);
    } catch {
      toast.error('Network error — please check your connection and try again');
    }
  }

  async function handleEmote(emoteId: EmoteId) {
    vibrate(30);
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
      }),
    });
  }

  async function handleChat(text: string) {
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        code,
        message: { playerId, playerName, avatarId, text },
      }),
    });
  }

  // NOTE: timer-expire is fired by ProjectorView only — avoids N concurrent requests from all players.
  // The host can always manually advance if no projector is open.

  useEffect(() => {
    if (!room || room.phase === 'lobby' || room.phase === 'game-over') return;
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
      <div className="min-h-screen bg-[#0d1b2e] flex flex-col gap-4 p-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-40" />
        <SkeletonCard className="h-32" />
      </div>
    );
  }

  const mySubmission = room.submissions[playerId];
  const phase = room.phase;
  const isMidGameNewPlayer = phase === 'submission' && !room.players[playerId];

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
        if (room.gameMode === 'friends' && room.currentChallenge) {
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
      case 'game-over':
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
              onClick={() => {
                localStorage.removeItem('vikas75_playerId');
                localStorage.removeItem('vikas75_playerName');
                localStorage.removeItem('vikas75_avatarId');
                localStorage.removeItem('vikas75_roomCode');
                localStorage.removeItem(`vikas75_hand_${code}`);
                router.replace('/');
              }}
              className="mt-4 px-8 h-14 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
            >
              Play Again →
            </button>
          </div>
        );
      default:
        return <PlayerWaiting phase={phase} />;
    }
  }

  const showEmoteAndChat = phase !== 'lobby' && phase !== 'game-over';

  return (
    <motion.main
      className="min-h-screen flex flex-col relative"
      animate={{ backgroundColor: PHASE_BG[phase] ?? '#0d1b35' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <ConnectionBanner />
      <MuteButton />

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <LogoLockup size="sm" />
        <div className="text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-[family-name:var(--font-inter)]">
            Round
          </p>
          <p className="font-[family-name:var(--font-bebas)] text-white text-xl">
            {room.round}/{room.totalRounds}
          </p>
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
            playerName={playerName}
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
