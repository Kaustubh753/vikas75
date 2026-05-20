'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom }

export default function ProjectorLobby({ room }: Props) {
  const players = Object.values(room.players);
  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => setJoinUrl(`${window.location.origin}/?code=${room.code}`), [room.code]);

  return (
    <div
      className="h-screen w-screen bg-[#1a3a6e] flex flex-col overflow-hidden relative"
      style={{ backgroundImage: 'radial-gradient(#ffffff0a 1px, transparent 1px)', backgroundSize: '36px 36px' }}
    >
      {/* Saffron top stripe */}
      <div className="h-1.5 flex flex-shrink-0">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/30" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Logo bar */}
      <div className="flex items-center justify-between px-12 py-4 flex-shrink-0">
        <div className="flex items-baseline gap-3">
          <span className="font-[family-name:var(--font-oswald)] text-white text-3xl uppercase tracking-widest">Vikas</span>
          <span className="font-[family-name:var(--font-oswald)] text-[#FF9933] text-3xl uppercase tracking-widest">75</span>
        </div>
        <p className="text-[#8aa8cc] text-sm tracking-widest uppercase">The Schemes Card Game</p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center gap-20 px-12 min-h-0">
        {/* QR code */}
        {joinUrl && (
          <div className="flex flex-col items-center gap-4 flex-shrink-0">
            <div className="bg-white p-5 rounded-2xl shadow-2xl">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <p className="text-[#8aa8cc] text-xs text-center max-w-[220px] break-all">{joinUrl}</p>
          </div>
        )}

        {/* Room code + players */}
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <p className="text-[#8aa8cc] tracking-[0.4em] uppercase text-sm mb-3">Room Code</p>
            <div className="flex gap-4">
              {room.code.split('').map((char, i) => (
                <div
                  key={i}
                  className="w-24 h-28 rounded-2xl border-2 border-[#FF9933]/40 bg-white/5 flex items-center justify-center
                    shadow-[0_0_40px_#FF993320]"
                >
                  <span className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-6xl font-bold">
                    {char}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[#8aa8cc]/60 text-xs mt-4 tracking-widest uppercase">
              Scan QR or enter code at vikas75.vercel.app
            </p>
          </div>

          {/* Player names */}
          <div className="text-center max-w-2xl">
            <p className="text-[#8aa8cc] uppercase tracking-[0.3em] text-xs mb-4">
              {players.length} {players.length === 1 ? 'player' : 'players'} joined
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map(p => (
                <span
                  key={p.id}
                  className="bg-white/10 border border-white/10 text-white px-5 py-2 rounded-full text-lg font-medium animate-fade-in"
                >
                  {p.name}
                </span>
              ))}
              {players.length === 0 && (
                <span className="text-[#8aa8cc] animate-pulse text-lg">Waiting for players…</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-center py-4 border-t border-white/5 flex-shrink-0">
        <p className="text-[#8aa8cc]/60 text-xs tracking-widest uppercase animate-pulse">
          Host: press Start Game when ready
        </p>
      </div>
    </div>
  );
}
