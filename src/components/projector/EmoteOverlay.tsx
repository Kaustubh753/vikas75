'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import Avatar from '@/lib/avatars';
import { EMOTES } from '@/lib/emotes';
import type { EmoteEvent } from '@/types/game';

interface FloatingEmote extends EmoteEvent {
  uid: string;
  x: number;
}

interface Props {
  code: string;
}

export default function EmoteOverlay({ code }: Props) {
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    channel.bind('game:emote', (event: EmoteEvent) => {
      const uid = `${event.playerId}-${Date.now()}`;
      const x = 10 + Math.random() * 80;
      setEmotes((prev) => [...prev, { ...event, uid, x }]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.uid !== uid));
      }, 5000);
    });
    return () => {
      channel.unbind('game:emote');
    };
  }, [code]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
      {emotes.map((e) => {
        const emote = EMOTES[e.emoteId];
        return (
          <motion.div
            key={e.uid}
            className="absolute bottom-20"
            style={{ left: `${e.x}%` }}
            initial={{ opacity: 0, y: 60, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-4 py-3 flex flex-col items-center gap-1 w-44">
              <span className="text-4xl">{emote.emoji}</span>
              <span className="text-white font-[family-name:var(--font-bebas)] text-lg tracking-wide">
                {emote.label}
              </span>
              <div className="flex items-center gap-2">
                <div className="rounded-md overflow-hidden">
                  <Avatar id={e.avatarId} size={20} />
                </div>
                <span className="text-white/60 text-xs font-[family-name:var(--font-inter)]">
                  {e.playerName}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
      </AnimatePresence>
    </div>
  );
}
