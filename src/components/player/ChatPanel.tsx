'use client';
import { useState, useRef, useEffect } from 'react';
import Avatar from '@/lib/avatars';
import type { ChatMessage, AvatarId } from '@/types/game';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  playerId: string;
  avatarId: AvatarId;
}

const MAX_CHARS = 120;

export default function ChatPanel({ messages, onSend, playerId, avatarId }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="fixed bottom-20 left-4 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {open && (
        <div
          className="absolute bottom-14 left-0 bg-[#0d1b35]/95 border border-white/20 rounded-2xl shadow-xl flex flex-col animate-bounce-in overflow-hidden"
          style={{ width: 'clamp(200px, calc(100vw - 80px), 260px)' }}
        >
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/70 text-sm font-[family-name:var(--font-inter)]">Chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white/70 text-lg"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-64 px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-white/30 text-xs text-center py-4 font-[family-name:var(--font-inter)] animate-pulse">
                Be the first to say something
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.playerId === playerId ? 'flex-row-reverse' : ''}`}
              >
                <div className="rounded-lg overflow-hidden flex-shrink-0">
                  <Avatar id={msg.avatarId} size={28} />
                </div>
                <div className={`max-w-[180px] ${msg.playerId === playerId ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className={`text-[10px] text-white/40 mb-0.5 font-[family-name:var(--font-inter)] ${msg.playerId === playerId ? 'text-right' : ''}`}>
                    {msg.playerName}
                  </span>
                  <div
                    className={`text-xs rounded-xl px-3 py-2 font-[family-name:var(--font-inter)] ${
                      msg.playerId === playerId
                        ? 'bg-[#FF9933]/20 text-white'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-white/10 px-3 py-2 flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Say something…"
              aria-label="Chat message"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FF9933] placeholder-white/30 font-[family-name:var(--font-inter)]"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="w-9 h-9 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 rounded-lg flex items-center justify-center text-white flex-shrink-0 transition-all"
            >
              ↑
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-xl shadow-lg transition-all active:scale-95"
        aria-label="Chat"
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
