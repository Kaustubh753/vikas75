'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient, getRoomChannel, onConnectionStateChange, type PusherConnectionState } from '@/lib/pusher-client';
import type { GameRoom, SchemeCard, AvatarId } from '@/types/game';
import PlayerLobby from './PlayerLobby';
import PlayerSubmit from './PlayerSubmit';
import PlayerWaiting from './PlayerWaiting';
import PlayerChallenge from './PlayerChallenge';
import ChatPanel from './ChatPanel';
import EmotePanel from './EmotePanel';

export default function PlayerView({ code }: { code: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [connState, setConnState] = useState<PusherConnectionState>('connecting');
  // Cache hand — Pusher broadcasts strip hand arrays to stay under 10 KB limit
  const [myHand, setMyHand] = useState<SchemeCard[]>([]);

  useEffect(() => {
    const id = sessionStorage.getItem('vikas75_playerId') ?? '';
    const name = sessionStorage.getItem('vikas75_playerName') ?? '';
    const avatar = (sessionStorage.getItem('vikas75_avatarId') ?? 'a1') as AvatarId;
    if (!id || !name) {
      router.replace(`/?code=${code}`);
      return;
    }
    setPlayerId(id);
    setPlayerName(name);
    setAvatarId(avatar);
  }, [code, router]);

  useEffect(() => {
    if (!playerId) return;

    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then(({ room: r, error: e }: { room?: GameRoom; error?: string }) => {
        if (e) { setError(e); return; }
        if (r) {
          setRoom(r);
          if (r.players[playerId]?.hand?.length) {
            setMyHand(r.players[playerId].hand);
          }
        }
      })
      .catch(() => setError('Could not reach the server — check your connection'));

    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:room-updated', (data: GameRoom) => {
      setRoom(data);
    });

    const cleanupConn = onConnectionStateChange(setConnState);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(getRoomChannel(code));
      cleanupConn();
    };
  }, [code, playerId]);

  if (error) return (
    <div className="min-h-screen bg-[#faf8f0] flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">{error}</p>
        <a href="/" className="text-[#1a3a6e] text-sm underline">← Back to home</a>
      </div>
    </div>
  );
  if (!room || !playerId) return <PlayerWaiting message="Connecting…" />;

  const hasSubmitted = !!room.submissions[playerId];
  const player = room.players[playerId];
  const playerWithHand = player ? { ...player, hand: myHand } : null;
  const isFriendsMode = room.gameMode === 'friends';

  const showEmotes = ['submission', 'challenge-reveal', 'reveal', 'judging', 'winner', 'between-rounds'].includes(room.phase);
  const showChat = room.phase !== 'lobby';

  let mainContent: React.ReactNode;

  switch (room.phase) {
    case 'lobby':
      mainContent = <PlayerLobby room={room} playerName={playerName} avatarId={avatarId} />;
      break;
    case 'challenge-reveal':
      mainContent = isFriendsMode
        ? <PlayerChallenge room={room} />
        : <PlayerWaiting message="New challenge coming up — watch the screen!" />;
      break;
    case 'submission':
      if (hasSubmitted) { mainContent = <PlayerWaiting message="Answer submitted! Waiting for others…" />; break; }
      if (!playerWithHand) { mainContent = <PlayerWaiting message="Waiting for your hand…" />; break; }
      mainContent = <PlayerSubmit room={room} player={playerWithHand} />;
      break;
    case 'reveal':
      mainContent = <PlayerWaiting message="All answers are in! Watch the projector." />;
      break;
    case 'judging':
      mainContent = <PlayerWaiting message="AI Judge is deliberating… 🤔" />;
      break;
    case 'winner':
      mainContent = <PlayerWaiting message="The verdict is in! See who won on screen." />;
      break;
    case 'between-rounds':
      mainContent = <PlayerWaiting message="Round over. Check the leaderboard on screen." />;
      break;
    case 'game-over':
      mainContent = <PlayerWaiting message="Game over! Check the final scores on screen." />;
      break;
    default:
      mainContent = <PlayerWaiting message="Stand by…" />;
  }

  // When the emote bar is visible it occupies ~110px at the bottom fixed.
  // Wrap main content in a div with matching bottom padding so nothing gets obscured.
  const EMOTE_BAR_HEIGHT = 'pb-[116px]';

  const isDisconnected = connState === 'unavailable' || connState === 'failed' || connState === 'disconnected';
  const isReconnecting = connState === 'connecting' && !!room; // only show after first connect

  return (
    <div className="relative">
      {(isDisconnected || isReconnecting) && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-[#1a3a6e] text-xs font-bold text-center py-2 px-4">
          {isDisconnected ? '⚠ Connection lost — updates paused' : '↻ Reconnecting…'}
        </div>
      )}
      <div className={showEmotes ? EMOTE_BAR_HEIGHT : ''}>
        {mainContent}
      </div>
      {showEmotes && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1a3a6e]/10 z-40">
          <EmotePanel code={code} playerId={playerId} playerName={playerName} avatarId={avatarId} />
        </div>
      )}
      {showChat && (
        <ChatPanel
          code={code}
          playerId={playerId}
          playerName={playerName}
          avatarId={avatarId}
          initialMessages={room.messages ?? []}
          bottomOffset={showEmotes ? 124 : 16}
        />
      )}
    </div>
  );
}
