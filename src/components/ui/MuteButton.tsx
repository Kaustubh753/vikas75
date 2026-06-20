'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import { getLobbyMusic } from '@/lib/music-manager';

// Projector sound toggle. Controls both the SFX manager and the lobby music in lockstep
// off the single shared "sound on" preference, so muting silences everything predictably.
export default function MuteButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setMuted(getMusicManager().muted);
  }, []);
  return (
    <button
      onClick={() => {
        const nowMuted = getMusicManager().toggleMute(); // SFX + shared preference
        getLobbyMusic().forceMute(nowMuted);             // lobby music follows
        setMuted(nowMuted);
      }}
      className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
