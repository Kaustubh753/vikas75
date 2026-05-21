'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';

export default function MuteButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(getMusicManager().muted);
  }, []);
  return (
    <button
      onClick={() => setMuted(getMusicManager().toggleMute())}
      className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
      aria-label={muted ? 'Unmute music' : 'Mute music'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
