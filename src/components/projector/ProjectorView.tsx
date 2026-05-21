'use client';

import { useEffect, useState, useRef } from 'react';
import { getPusherClient, getRoomChannel, onConnectionStateChange, type PusherConnectionState } from '@/lib/pusher-client';
import type { GameRoom } from '@/types/game';
import ProjectorLobby from './ProjectorLobby';
import ProjectorChallengeReveal from './ProjectorChallengeReveal';
import ProjectorSubmission from './ProjectorSubmission';
import ProjectorReveal from './ProjectorReveal';
import ProjectorJudging from './ProjectorJudging';
import ProjectorWinner from './ProjectorWinner';
import ProjectorBetweenRounds from './ProjectorBetweenRounds';
import ProjectorGameOver from './ProjectorGameOver';
import EmoteOverlay from './EmoteOverlay';

export default function ProjectorView({ code }: { code: string }) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [connState, setConnState] = useState<PusherConnectionState>('connecting');
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then(({ room: r, error: e }: { room?: GameRoom; error?: string }) => {
        if (e) setError(e);
        else if (r) setRoom(r);
      })
      .catch(() => setError('Could not reach the server — check your connection'));

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:room-updated', (data: GameRoom) => {
      if (prevPhaseRef.current && prevPhaseRef.current !== data.phase) {
        setTransitioning(true);
        setTimeout(() => setTransitioning(false), 400);
      }
      prevPhaseRef.current = data.phase;
      setRoom(data);
    });

    const cleanupConn = onConnectionStateChange(setConnState);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
      cleanupConn();
    };
  }, [code]);

  if (error) return <ProjectorError message={error} />;
  if (!room) return <ProjectorLoading />;

  const screen = (() => {
    switch (room.phase) {
      case 'lobby':            return <ProjectorLobby room={room} />;
      case 'challenge-reveal': return <ProjectorChallengeReveal room={room} />;
      case 'submission':       return <ProjectorSubmission room={room} />;
      case 'reveal':           return <ProjectorReveal room={room} />;
      case 'judging':          return <ProjectorJudging />;
      case 'winner':           return <ProjectorWinner room={room} />;
      case 'between-rounds':   return <ProjectorBetweenRounds room={room} />;
      case 'game-over':        return <ProjectorGameOver room={room} />;
      default:                 return <ProjectorLoading />;
    }
  })();

  const isDisconnected = connState === 'unavailable' || connState === 'failed' || connState === 'disconnected';
  const isReconnecting = connState === 'connecting';

  return (
    <div className="relative">
      <div
        className={`transition-opacity duration-300 ${transitioning ? 'opacity-0' : 'opacity-100'}`}
        key={room.phase}
      >
        {screen}
      </div>
      <EmoteOverlay code={code} />
      {(isDisconnected || isReconnecting) && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-black/80 text-white text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-xl">
          <span className={`w-2 h-2 rounded-full ${isDisconnected ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} aria-hidden="true" />
          {isDisconnected ? 'Connection lost — waiting to reconnect' : 'Reconnecting…'}
        </div>
      )}
    </div>
  );
}

function ProjectorLoading() {
  return (
    <div className="h-screen w-screen bg-[#0d2240] flex items-center justify-center">
      <p className="text-white text-2xl font-[family-name:var(--font-oswald)] tracking-widest uppercase animate-pulse">
        Loading…
      </p>
    </div>
  );
}

function ProjectorError({ message }: { message: string }) {
  return (
    <div className="h-screen w-screen bg-[#0d2240] flex items-center justify-center">
      <p className="text-red-300 text-xl">{message}</p>
    </div>
  );
}
