'use client';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import EmoteOverlay from '@/components/projector/EmoteOverlay';
import MuteButton from '@/components/ui/MuteButton';
import ProjectorLobby from '@/components/projector/ProjectorLobby';
import ProjectorChallengeReveal from '@/components/projector/ProjectorChallengeReveal';
import ProjectorSubmission from '@/components/projector/ProjectorSubmission';
import ProjectorReveal from '@/components/projector/ProjectorReveal';
import ProjectorJudging from '@/components/projector/ProjectorJudging';
import ProjectorWinner from '@/components/projector/ProjectorWinner';
import ProjectorBetweenRounds from '@/components/projector/ProjectorBetweenRounds';
import ProjectorGameOver from '@/components/projector/ProjectorGameOver';
import SkeletonCard from '@/components/ui/SkeletonCard';
import type { GameRoom } from '@/types/game';

interface Props { code: string }

export default function ProjectorView({ code }: Props) {
  const [room, setRoom] = useState<GameRoom | null>(null);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoom(d.room); })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    const onRoomUpdated = (updated: GameRoom) => setRoom(updated);
    channel.bind('game:room-updated', onRoomUpdated);
    return () => {
      channel.unbind('game:room-updated', onRoomUpdated);
      // Do NOT call pusher.unsubscribe here — EmoteOverlay shares this channel and must keep receiving game:emote
    };
  }, [code]);

  // Backup timer-expire trigger — projector is always connected, so this is more reliable than player phones
  const timerExpire = useCallback(() => {
    fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'timer-expire', code }),
    }).catch(() => {});
  }, [code]);

  useEffect(() => {
    if (!room?.timerEndsAt || room.phase !== 'submission') return;
    const delay = room.timerEndsAt - Date.now();
    if (delay <= 0) { timerExpire(); return; }
    const t = setTimeout(timerExpire, delay);
    return () => clearTimeout(t);
  }, [room?.timerEndsAt, room?.phase, timerExpire]);

  function renderPhase() {
    if (!room) return null;
    switch (room.phase) {
      case 'lobby':            return <ProjectorLobby room={room} />;
      case 'challenge-reveal': return <ProjectorChallengeReveal room={room} />;
      case 'submission':       return <ProjectorSubmission room={room} />;
      case 'reveal':           return <ProjectorReveal room={room} />;
      case 'judging':          return <ProjectorJudging />;
      case 'winner':           return <ProjectorWinner room={room} />;
      case 'between-rounds':   return <ProjectorBetweenRounds room={room} />;
      case 'game-over':        return <ProjectorGameOver room={room} />;
      default:                 return null;
    }
  }

  if (!room) {
    return (
      <div className="w-screen h-screen bg-[#0d1b2e] flex items-center justify-center p-12">
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Portrait orientation guard — hidden in landscape via CSS media query in globals.css */}
      <div className="portrait-lock">
        <span style={{ fontSize: 64 }}>🔄</span>
        <p className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-wide text-center px-8">
          Please rotate your screen to landscape
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={room.phase}
          className="w-full h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
      <EmoteOverlay code={code} />
      <MuteButton />
    </div>
  );
}
