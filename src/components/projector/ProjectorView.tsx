'use client';
import { useState, useEffect } from 'react';
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
import type { GameRoom } from '@/types/game';

interface Props { code: string }

export default function ProjectorView({ code }: Props) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoom(d.room); })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));

    channel.bind('game:room-updated', (updated: GameRoom) => {
      setTransitioning(true);
      setTimeout(() => {
        setRoom(updated);
        setTransitioning(false);
      }, 200);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  if (!room) {
    return (
      <div className="w-screen h-screen bg-[#0d1b2e] flex items-center justify-center">
        <p className="text-white/40 font-[family-name:var(--font-bebas)] text-3xl tracking-widest animate-pulse">
          Loading…
        </p>
      </div>
    );
  }

  function renderPhase() {
    if (!room) return null;
    switch (room.phase) {
      case 'lobby':           return <ProjectorLobby room={room} />;
      case 'challenge-reveal': return <ProjectorChallengeReveal room={room} />;
      case 'submission':      return <ProjectorSubmission room={room} />;
      case 'reveal':          return <ProjectorReveal room={room} />;
      case 'judging':         return <ProjectorJudging />;
      case 'winner':          return <ProjectorWinner room={room} />;
      case 'between-rounds':  return <ProjectorBetweenRounds room={room} />;
      case 'game-over':       return <ProjectorGameOver room={room} />;
      default:                return null;
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      <div className={`w-full h-full transition-opacity duration-200 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        {renderPhase()}
      </div>
      <EmoteOverlay code={code} />
      <MuteButton />
    </div>
  );
}
