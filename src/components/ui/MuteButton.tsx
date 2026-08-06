'use client';
import { useState, useEffect } from 'react';
import { getMusicManager } from '@/lib/music';
import { getLobbyMusic } from '@/lib/music-manager';

/* The single sound control for the projector — music and SFX together, off one shared
 * preference (`vikas75-sound-on`).
 *
 * It used to drive the lobby music through `forceMute`, which is the lever the *host's* remote
 * mute uses. That left the real preference untouched, so the button and the host bar's own music
 * toggle each kept their own idea of the state and neither reflected the other. Worse, if the
 * browser had blocked autoplay the track had never started, and toggling a mute flag on silence
 * did nothing you could hear — which is how both buttons ended up looking broken.
 *
 * Turning sound on now goes through `toggle()`, which flips the stored preference and fades the
 * track in. That happens inside a click, so it counts as a user gesture and playback is allowed
 * even where autoplay was refused.
 */
export default function MuteButton() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const soundOn = localStorage.getItem('vikas75-sound-on') === 'true';
    getMusicManager().setMuted(!soundOn);
    setMuted(!soundOn);
  }, []);

  return (
    <button
      onClick={() => {
        const music = getLobbyMusic();
        music.forceMute(false);              // a press here overrides any stale remote mute
        const soundOn = music.toggle();      // flips the shared preference, fades in or cuts out
        getMusicManager().setMuted(!soundOn); // SFX follow the same preference
        setMuted(!soundOn);
      }}
      className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Turn sound on' : 'Turn sound off'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
