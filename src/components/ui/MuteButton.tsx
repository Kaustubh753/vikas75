'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import { getLobbyMusic } from '@/lib/music-manager';

// Projector sound toggle. Controls both the SFX manager and the lobby music in lockstep
// off the single shared "sound on" preference, so muting silences everything predictably.
export default function MuteButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    // Derive both the icon and the SFX manager from the single shared "sound on" key. The
    // lobby's autoPlay may have just turned sound on, which the SFX manager (constructed
    // earlier) wouldn't otherwise reflect — re-sync it so the icon and audio always agree.
    // (Music playback itself is autoPlay's job; we only reconcile SFX + icon here.)
    const soundOn = localStorage.getItem('vikas75-sound-on') === 'true';
    getMusicManager().setMuted(!soundOn);
    setMuted(!soundOn);
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
