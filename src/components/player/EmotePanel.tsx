'use client';
import { useState, useRef } from 'react';
import { EMOTES, EMOTE_IDS } from '@/lib/emotes';
import type { EmoteId } from '@/types/game';

interface Props {
  onEmote: (emoteId: EmoteId) => void;
}

const RATE_LIMIT_MS = 5000;

export default function EmotePanel({ onEmote }: Props) {
  const [open, setOpen] = useState(false);
  const [lastSent, setLastSent] = useState<EmoteId | null>(null);
  const lastEmoteAt = useRef<number>(0);

  function handleEmote(id: EmoteId) {
    const now = Date.now();
    if (now - lastEmoteAt.current < RATE_LIMIT_MS) return;
    lastEmoteAt.current = now;
    onEmote(id);
    setLastSent(id);
    setTimeout(() => setLastSent(null), 1500);
    setOpen(false);
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {open && (
        <div className="bg-[#0d1b2e]/95 border border-white/20 rounded-2xl p-3 grid grid-cols-2 gap-2 shadow-xl animate-bounce-in">
          {EMOTE_IDS.map((id) => {
            const e = EMOTES[id];
            return (
              <button
                key={id}
                onClick={() => handleEmote(id)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 transition-all active:scale-95 min-w-[64px]"
              >
                <span className="text-2xl">{e.emoji}</span>
                <span className="text-white/70 text-[10px] font-[family-name:var(--font-inter)] text-center leading-tight">
                  {e.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Brief sent confirmation */}
      {lastSent && (
        <div className="bg-black/80 rounded-xl px-3 py-1.5 flex items-center gap-2 animate-bounce-in">
          <span className="text-lg">{EMOTES[lastSent].emoji}</span>
          <span className="text-white/80 text-xs font-[family-name:var(--font-inter)]">Sent!</span>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-[#FF9933] hover:bg-[#e8872a] flex items-center justify-center text-2xl shadow-lg transition-all active:scale-95"
        aria-label="Emotes"
      >
        {open ? '✕' : '😄'}
      </button>
    </div>
  );
}
