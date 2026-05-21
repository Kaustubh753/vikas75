'use client';
import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import LogoLockup from '@/components/ui/LogoLockup';
import SocialLinks from '@/components/ui/SocialLinks';
import Avatar from '@/lib/avatars';
import { getMusicManager } from '@/lib/music';
import type { GameRoom } from '@/types/game';

interface Props {
  room: GameRoom;
}

export default function ProjectorLobby({ room }: Props) {
  const [origin, setOrigin] = useState('');
  const players = Object.values(room.players);

  useEffect(() => {
    setOrigin(window.location.origin);
    getMusicManager().play('lobby');
  }, []);

  const joinUrl = origin ? `${origin}/?code=${room.code}` : `Join → ${room.code}`;

  // Stable particles — generated once, never on re-render
  const particlesRef = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      size: 3 + Math.floor(Math.random() * 5),
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 3}s`,
      color: ['#FF9933', '#FFFFFF', '#138808', '#FFD700'][Math.floor(Math.random() * 4)],
    }))
  );
  const particles = particlesRef.current;

  return (
    <div className="relative w-full h-full bg-[#0d1b2e] flex flex-col overflow-hidden">
      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20 animate-bounce"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-1 items-center justify-between px-12 py-8">
        {/* Left: QR code */}
        <div className="flex flex-col items-center gap-4">
          {origin && (
            <>
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
              <p className="text-white/50 text-sm font-[family-name:var(--font-inter)] text-center max-w-[220px]">
                {joinUrl}
              </p>
            </>
          )}
          <p className="text-white/40 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
            Scan to join
          </p>
        </div>

        {/* Center: Logo */}
        <div className="flex flex-col items-center gap-6">
          <LogoLockup size="lg" />
          <div className="w-48 h-1.5 flex rounded-full overflow-hidden">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>
          <p className="text-white/50 text-lg font-[family-name:var(--font-inter)] text-center">
            The Government Schemes Card Game
          </p>
        </div>

        {/* Right: Room code */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/40 text-sm uppercase tracking-widest font-[family-name:var(--font-inter)]">
            Room Code
          </p>
          <div
            className="font-[family-name:var(--font-bebas)] text-[#FF9933] leading-none tracking-[0.15em] animate-pulse-ring"
            style={{ fontSize: '120px' }}
          >
            {room.code}
          </div>
        </div>
      </div>

      {/* Players area */}
      {players.length > 0 && (
        <div className="relative z-10 px-12 pb-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
            Players ({players.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {players.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 animate-bounce-in"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="rounded-lg overflow-hidden">
                  <Avatar id={p.avatarId} size={32} />
                </div>
                <span className="text-white text-sm font-[family-name:var(--font-inter)]">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 px-12 py-4 flex items-center justify-between">
        <p className="text-white/30 text-xs font-[family-name:var(--font-inter)]">
          An initiative of the Office of Shri Sujeet Kumar
        </p>
        <SocialLinks />
      </div>
    </div>
  );
}
