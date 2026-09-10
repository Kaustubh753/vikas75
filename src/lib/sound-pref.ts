/**
 * The single "sound on" preference, shared by the lobby music (`music-manager.ts`), the SFX
 * stings (`music.ts`) and the mute button — one user toggle controls all three.
 *
 * Access goes through here for two reasons. The key string was written out in five places, so
 * a rename would have half the app reading one key and half another; and `localStorage` on a
 * device that blocks site data (private mode, enterprise policy) **throws** rather than
 * returning null. Two of the raw reads were unguarded and sat in effects reached by five
 * projector phase components and PlayerView, so a blocked device took the whole screen to the
 * error boundary — mid-game. Sound is a convenience: it fails to "off", never to a crash.
 */
const KEY = 'vikas75-sound-on';

export function soundOn(fallback = false): boolean {
  try {
    const stored = typeof window === 'undefined' ? null : localStorage.getItem(KEY);
    return stored === null ? fallback : stored === 'true';
  } catch {
    return fallback;
  }
}

export function setSoundOn(on: boolean): void {
  try { localStorage.setItem(KEY, String(on)); } catch { /* blocked storage — in-memory only */ }
}
