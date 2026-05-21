'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import Avatar from '@/lib/avatars';
import type { ChatMessage, AvatarId } from '@/types/game';

interface Props {
  code: string;
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  initialMessages: ChatMessage[];
  bottomOffset?: number; // px from bottom for the toggle button (default 16)
}

export default function ChatPanel({ code, playerId, playerName, avatarId, initialMessages, bottomOffset = 16 }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Subscribe once on mount — use ref for `open` to avoid re-subscribing on toggle
  useEffect(() => {
    const pusher = getPusherClient();
    const ch = pusher.subscribe(getRoomChannel(code));
    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-19), msg]);
      if (!openRef.current) setUnread((n) => n + 1);
    };
    ch.bind('game:chat', handler);
    return () => {
      ch.unbind('game:chat', handler);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          code,
          message: { playerId, playerName, avatarId, text: trimmed },
        }),
      });
    } finally {
      setSending(false);
    }
  }, [text, sending, code, playerId, playerName, avatarId]);

  return (
    <div className="fixed right-4 z-50" style={{ bottom: bottomOffset }}>
      {/* Panel */}
      {open && (
        <div
          className="mb-2 w-72 bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#1a3a6e]/10 flex flex-col"
          style={{ maxHeight: '360px' }}
          role="dialog"
          aria-label="Chat"
        >
          <div className="bg-[#1a3a6e] px-4 py-2.5 flex items-center justify-between">
            <span className="text-white text-sm font-bold tracking-wide">Chat</span>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#faf8f0]" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 && (
              <p className="text-gray-400 text-xs text-center py-4">No messages yet. Say something! 👋</p>
            )}
            {messages.map((m) => {
              const isMe = m.playerId === playerId;
              return (
                <div key={m.id} className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar id={m.avatarId} size={24} className="rounded-md flex-shrink-0" />
                  <div className={`max-w-[180px] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isMe && (
                      <span className="text-[#8899aa] text-[9px] uppercase tracking-wide mb-0.5">{m.playerName}</span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-xl text-xs leading-snug ${
                        isMe
                          ? 'bg-[#1a3a6e] text-white rounded-br-sm'
                          : 'bg-white text-[#1a3a6e] rounded-bl-sm border border-[#1a3a6e]/10'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {/* Input */}
          <div className="p-2 border-t border-[#1a3a6e]/10 flex gap-2 bg-white">
            <input
              className="flex-1 text-xs border border-[#1a3a6e]/20 rounded-lg px-3 py-2 outline-none focus:border-[#1a3a6e] text-[#1a3a6e] min-h-[44px]"
              placeholder="Type something…"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 120))}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              maxLength={120}
              aria-label="Chat message"
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              className="bg-[#1a3a6e] text-white text-xs px-3 rounded-lg disabled:opacity-40 active:scale-95 min-w-[44px] min-h-[44px]"
              aria-label="Send message"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Toggle bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 bg-[#1a3a6e] rounded-full shadow-lg flex items-center justify-center text-xl relative active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label={open ? 'Close chat' : `Open chat${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        💬
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 bg-[#FF9933] text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
