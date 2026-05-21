'use client';

import { useState, useCallback } from 'react';
import { EMOTES, EMOTE_IDS } from '@/lib/emotes';
import type { AvatarId, EmoteId } from '@/types/game';

interface Props {
  code: string;
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
}

export default function EmotePanel({ code, playerId, playerName, avatarId }: Props) {
  const [cooldown, setCooldown] = useState<EmoteId | null>(null);

  const send = useCallback(async (emoteId: EmoteId) => {
    if (cooldown) return;
    setCooldown(emoteId);
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'emote',
          code,
          emote: { playerId, playerName, avatarId, emoteId, sentAt: Date.now() },
        }),
      });
    } finally {
      setTimeout(() => setCooldown(null), 3000);
    }
  }, [cooldown, code, playerId, playerName, avatarId]);

  return (
    <div className="px-4 py-3 border-t border-[#1a3a6e]/10">
      <p className="text-[#8899aa] text-[9px] uppercase tracking-[0.3em] mb-2" aria-hidden="true">Emotes</p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Send an emote">
        {EMOTE_IDS.map((id) => {
          const e = EMOTES[id];
          const active = cooldown === id;
          return (
            <button
              key={id}
              onClick={() => send(id)}
              disabled={!!cooldown}
              aria-label={`Send ${e.label} emote`}
              aria-pressed={active}
              className={`flex flex-col items-center gap-0.5 py-3 px-1 rounded-xl border transition-all active:scale-95 text-center min-h-[56px] ${
                active
                  ? 'bg-[#1a3a6e] border-[#1a3a6e] text-white scale-95'
                  : 'bg-white border-[#1a3a6e]/15 text-[#1a3a6e] disabled:opacity-40'
              }`}
            >
              <span className="text-lg" aria-hidden="true">{e.emoji}</span>
              <span className="text-[8px] font-bold uppercase tracking-wide leading-tight">{e.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
