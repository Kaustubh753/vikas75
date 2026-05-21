'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
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

export default function PlayerView({ code }: Props) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [cachedHand, setCachedHand] = useState<SchemeCard[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const toastedJoin = useRef(false);
  const prevPhaseRef = useRef<string | null>(null);

  // Load identity from localStorage
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
    setHydrated(true);
  }, [code, router]);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/game?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        const r: GameRoom = data.room;
        setRoom(r);
        const pid = localStorage.getItem('vikas75_playerId') ?? '';
        if (pid && r.players[pid]) {
          setCachedHand(r.players[pid].hand);
        }
        if (!toastedJoin.current && pid && r.players[pid]) {
          toast.success('Joined room!');
          toastedJoin.current = true;
        }
      }
    } catch {
      // ignore
    }
  }, [code]);

  useEffect(() => {
    if (hydrated) fetchRoom();
  }, [hydrated, fetchRoom]);

  useEffect(() => {
    if (!hydrated) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));

    const onRoomUpdated = (updated: GameRoom) => {
      setRoom(updated);
      const pid = localStorage.getItem('vikas75_playerId') ?? '';
      if (pid && updated.players[pid]) {
        setCachedHand(updated.players[pid].hand);
      }
    };

    // Chat messages come as individual game:chat events — room:updated does NOT include them
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

  // Toast on phase change to challenge-reveal
  useEffect(() => {
    if (!room) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = room.phase;
    if (prev !== null && prev !== room.phase && room.phase === 'challenge-reveal') {
      toast('Round starting...', { icon: '🎯' });
    }
  }, [room?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStart() {
    setStartLoading(true);
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', code, hostId: playerId }),
      });
    } catch {
      // ignore
    }
    setStartLoading(false);
  }

  async function handleSubmit(card: SchemeCard, explanation: string) {
    try {
      await fetch('/api/game', {
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
      toast.success('Answer submitted!');
      try { (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.(50); } catch {}
    } catch {
      // Network error — player can retry
    }
  }

  async function handleEmote(emoteId: EmoteId) {
    try { (navigator as Navigator & { vibrate?: (p: number | number[]) => void }).vibrate?.(30); } catch {}
    await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'emote',
        code,
        emote: { playerId, playerName, avatarId, emoteId, sentAt: Date.now() },
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

  // When submission timer expires, tell the server to advance (idempotent — server checks timerEndsAt)
  useEffect(() => {
    if (!room?.timerEndsAt || room.phase !== 'submission') return;
    const delay = room.timerEndsAt - Date.now();
    const fire = () => {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'timer-expire', code }),
      }).catch(() => {});
    };
    if (delay <= 0) { fire(); return; }
    const t = setTimeout(fire, delay);
    return () => clearTimeout(t);
  }, [room?.timerEndsAt, room?.phase, code]);

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
        return (
          <PlayerLobby
            room={room}
            playerId={playerId}
            onStart={handleStart}
            startLoading={startLoading}
          />
        );
      case 'challenge-reveal':
        if (room.gameMode === 'friends' && room.currentChallenge) {
          return <PlayerChallengeReveal challenge={room.currentChallenge} />;
        }
        return <PlayerWaiting phase={phase} />;
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
      default:
        return <PlayerWaiting phase={phase} />;
    }
  }

  const showEmoteAndChat = phase !== 'lobby' && phase !== 'game-over';

  return (
    <main className="min-h-screen bg-[#0d1b2e] flex flex-col">
      <ConnectionBanner />
      <MuteButton />

      {/* Header */}
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

      {/* Main content */}
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
    </main>
  );
}
