'use client';

import { useEffect, useState } from 'react';
import type { GameRoom } from '@/types/game';
import ChallengeCard from '@/components/cards/ChallengeCard';
import { getPusherClient, getRoomChannel } from '@/lib/pusher';

interface Props { room: GameRoom }

export default function ProjectorSubmission({ room: initialRoom }: Props) {
  const [room, setRoom] = useState(initialRoom);
  const players = Object.values(room.players);
  const submitted = Object.keys(room.submissions);
  const timeLeft = room.timerEndsAt ? Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)) : 90;
  const [seconds, setSeconds] = useState(timeLeft);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(room.code));
    channel.bind('game:room-updated', setRoom);
    channel.bind('game:player-submitted', () => {});
    return () => { channel.unbind_all(); pusher.unsubscribe(getRoomChannel(room.code)); };
  }, [room.code]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!room.timerEndsAt) return;
      setSeconds(Math.max(0, Math.ceil((room.timerEndsAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [room.timerEndsAt]);

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex gap-10 p-12 items-start">
      {/* Challenge on the left */}
      <div className="flex-1">
        <p className="text-[#8aa8cc] uppercase tracking-widest text-sm mb-4">
          Round {room.round} — Submit your scheme
        </p>
        {room.currentChallenge && <ChallengeCard card={room.currentChallenge} size="projector" />}
      </div>

      {/* Submission tracker on right */}
      <div className="w-72 flex flex-col gap-4">
        <div className="text-center">
          <p className="text-[#FFD700] font-[family-name:var(--font-oswald)] text-6xl font-bold">
            {seconds}
          </p>
          <p className="text-[#8aa8cc] text-sm uppercase tracking-widest">seconds left</p>
        </div>
        <p className="text-white text-lg text-center">
          {submitted.length} / {players.length} submitted
        </p>
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${submitted.includes(p.id) ? 'bg-[#138808]' : 'bg-white/20'}`} />
              <span className={`text-base ${submitted.includes(p.id) ? 'text-white' : 'text-white/40'}`}>
                {p.name}
              </span>
              {submitted.includes(p.id) && <span className="text-[#138808] ml-auto">✓</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
