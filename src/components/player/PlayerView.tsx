'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient, getRoomChannel } from '@/lib/pusher';
import type { GameRoom } from '@/types/game';
import PlayerLobby from './PlayerLobby';
import PlayerSubmit from './PlayerSubmit';
import PlayerWaiting from './PlayerWaiting';

export default function PlayerView({ code }: { code: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read identity lazily on client to avoid SSR/hydration mismatch
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const id = sessionStorage.getItem('vikas75_playerId') ?? '';
    const name = sessionStorage.getItem('vikas75_playerName') ?? '';
    if (!id || !name) {
      // No identity — send back to home pre-filled with code
      router.replace(`/?code=${code}`);
      return;
    }
    setPlayerId(id);
    setPlayerName(name);
  }, [code, router]);

  useEffect(() => {
    if (!playerId) return;
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
  }, [code, playerId]);

  if (error) return (
    <div className="min-h-screen bg-[#faf8f0] flex items-center justify-center">
      <p className="text-red-600 font-medium">{error}</p>
    </div>
  );
  if (!room || !playerId) return <PlayerWaiting message="Connecting…" />;

  const hasSubmitted = !!room.submissions[playerId];
  const player = room.players[playerId];

  switch (room.phase) {
    case 'lobby':
      return <PlayerLobby room={room} playerName={playerName} />;
    case 'submission':
      if (hasSubmitted) return <PlayerWaiting message="Answer submitted! Waiting for others…" />;
      if (!player) return <PlayerWaiting message="Waiting for your hand…" />;
      return <PlayerSubmit room={room} player={player} />;
    case 'challenge-reveal':
      return <PlayerWaiting message="New challenge coming up — watch the screen!" />;
    case 'reveal':
      return <PlayerWaiting message="All answers are in! Watch the projector." />;
    case 'judging':
      return <PlayerWaiting message="AI Judge is deliberating… 🤔" />;
    case 'winner':
      return <PlayerWaiting message="The verdict is in! See who won on screen." />;
    case 'between-rounds':
      return <PlayerWaiting message="Round over. Check the leaderboard on screen." />;
    case 'game-over':
      return <PlayerWaiting message="Game over! Check the final scores on screen." />;
    default:
      return <PlayerWaiting message="Stand by…" />;
  }
}
