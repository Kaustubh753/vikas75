'use client';

import { useEffect, useState } from 'react';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import Avatar from '@/lib/avatars';
import { EMOTES } from '@/lib/emotes';
import type { EmoteEvent } from '@/types/game';

interface ActiveEmote extends EmoteEvent {
  uid: string;
  x: number; // percent from left
}

export default function EmoteOverlay({ code }: { code: string }) {
  const [emotes, setEmotes] = useState<ActiveEmote[]>([]);

  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(getRoomChannel(code));
    const handler = (data: EmoteEvent) => {
      const uid = `${data.playerId}-${Date.now()}`;
      const x = 10 + Math.random() * 80;
      setEmotes((prev) => [...prev, { ...data, uid, x }]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.uid !== uid));
      }, 3500);
    };
    ch.bind('game:emote', handler);
    return () => {
      ch.unbind('game:emote', handler);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  if (emotes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
      {emotes.map((e) => {
        const emoteData = EMOTES[e.emoteId];
        return (
          <div
            key={e.uid}
            className="absolute bottom-20 animate-emote-float flex flex-col items-center gap-1"
            style={{ left: `${e.x}%`, transform: 'translateX(-50%)' }}
          >
            <div className="bg-white/95 border border-white/60 rounded-2xl px-4 py-3 shadow-2xl text-center">
              <div className="text-4xl">{emoteData?.emoji}</div>
              <div className="text-[#1a3a6e] text-xs font-bold mt-1 tracking-wide">{emoteData?.label}</div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur rounded-full px-3 py-1">
              <Avatar id={e.avatarId} size={20} className="rounded-full" />
              <span className="text-white text-xs font-medium">{e.playerName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
