'use client';

import { useEffect, useState } from 'react';
import { getPusherClient, getRoomChannel } from '@/lib/pusher';
import type { GameRoom } from '@/types/game';
import ProjectorLobby from './ProjectorLobby';
import ProjectorChallengeReveal from './ProjectorChallengeReveal';
import ProjectorSubmission from './ProjectorSubmission';
import ProjectorReveal from './ProjectorReveal';
import ProjectorJudging from './ProjectorJudging';
import ProjectorWinner from './ProjectorWinner';
import ProjectorBetweenRounds from './ProjectorBetweenRounds';
import ProjectorGameOver from './ProjectorGameOver';

export default function ProjectorView({ code }: { code: string }) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then(({ room, error }) => {
        if (error) setError(error);
        else setRoom(room);
      });

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:room-updated', (data: GameRoom) => setRoom(data));
    channel.bind('game:phase-changed', ({ room }: { room: GameRoom }) => setRoom(room));
    channel.bind('game:verdict', ({ room }: { room: GameRoom }) => setRoom(room));
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  if (error) return <ProjectorError message={error} />;
  if (!room) return <ProjectorLoading />;

  switch (room.phase) {
    case 'lobby':             return <ProjectorLobby room={room} />;
    case 'challenge-reveal':  return <ProjectorChallengeReveal room={room} />;
    case 'submission':        return <ProjectorSubmission room={room} />;
    case 'reveal':            return <ProjectorReveal room={room} />;
    case 'judging':           return <ProjectorJudging />;
    case 'winner':            return <ProjectorWinner room={room} />;
    case 'between-rounds':    return <ProjectorBetweenRounds room={room} />;
    case 'game-over':         return <ProjectorGameOver room={room} />;
    default:                  return <ProjectorLoading />;
  }
}

function ProjectorLoading() {
  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex items-center justify-center">
      <p className="text-white text-2xl font-[family-name:var(--font-oswald)] tracking-widest uppercase animate-pulse">
        Loading…
      </p>
    </div>
  );
}

function ProjectorError({ message }: { message: string }) {
  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex items-center justify-center">
      <p className="text-red-300 text-xl">{message}</p>
    </div>
  );
}
