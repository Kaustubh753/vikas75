'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    const channel = getPusherClient().subscribe(getRoomChannel(code));

    const onEmote = (payload: EmoteEvent) => {
      const uid = `${payload.playerId}-${payload.timestamp ?? Date.now()}`;
      const x = 8 + Math.random() * 78;
      const entry: FloatingEmote = { ...payload, uid, x };
      setEmotes((prev) => [...prev, entry]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.uid !== uid));
      }, 5200);
    };

    channel.bind('emote', onEmote);
    return () => {
      channel.unbind('emote', onEmote);
      getPusherClient().unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {emotes.map((e) => {
        const emoteData = EMOTES[e.emote];
        if (!emoteData) return null;
        return (
          <motion.div
            key={e.uid}
            className="absolute"
            style={{ left: `${e.x}%`, bottom: '15%' }}
            initial={{ opacity: 0, y: 60, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 1, 1, 0],
              y: [60, 0, -80, -180, -300],
              scale: [0.4, 1, 1, 1, 0.85],
            }}
            transition={{ duration: 5, times: [0, 0.1, 0.4, 0.75, 1], ease: 'easeOut' }}
          >
            <div
              className="bg-black/75 backdrop-blur-sm rounded-2xl px-5 py-4 flex flex-col items-center gap-2 shadow-2xl"
              style={{ minWidth: 160 }}
            >
              <span style={{ fontSize: 48 }}>{emoteData.emoji}</span>
              <span className="text-white font-[family-name:var(--font-bebas)] text-xl tracking-wide">
                {emoteData.label}
              </span>
              <div className="flex items-center gap-2">
                <div className="rounded-md overflow-hidden">
                  <Avatar id={e.avatarId} size={22} />
                </div>
                <span className="text-white/60 text-xs font-[family-name:var(--font-inter)]">
                  {e.playerName}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
