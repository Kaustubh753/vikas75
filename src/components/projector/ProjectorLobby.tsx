'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorLobby({ room }: Props) {
  const players = Object.values(room.players);
  // Build full join URL on client — links to home page pre-filled with code
  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/?code=${room.code}`);
  }, [room.code]);

  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8 p-12 overflow-hidden">
      {/* Branding */}
      <h1 className="font-[family-name:var(--font-oswald)] text-white text-5xl tracking-widest uppercase">
        Vikas 75
      </h1>

      <div className="flex gap-16 items-center">
        {/* QR code */}
        {joinUrl && (
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-[#8aa8cc] text-xs text-center max-w-[180px] break-all">{joinUrl}</p>
          </div>
        )}

        {/* Room code */}
        <div className="text-center">
          <p className="text-[#8aa8cc] tracking-widest uppercase text-sm mb-2">Room Code</p>
          <p className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-9xl tracking-[0.3em] font-bold leading-none">
            {room.code}
          </p>
          <p className="text-[#8aa8cc] text-sm mt-3">Enter code at vikas75.vercel.app</p>
        </div>
      </div>

      {/* Player list */}
      <div className="text-center">
        <p className="text-[#8aa8cc] uppercase tracking-widest text-xs mb-4">
          {players.length} player{players.length !== 1 ? 's' : ''} joined
        </p>
        <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
          {players.map((p) => (
            <span
              key={p.id}
              className="bg-white/10 text-white px-5 py-2 rounded-full text-lg font-medium animate-fade-in"
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[#8aa8cc] text-sm animate-pulse">
        Waiting for host to start the game…
      </p>
    </div>
  );
}
