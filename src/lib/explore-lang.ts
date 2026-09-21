/**
 * The Explore ("Know Your Deck") language: which of the two scheme-guide decks the reader is
 * looking at, and which language the page's own chrome speaks. English is the default; the
 * choice is remembered per device.
 *
 * Access goes through here rather than reading `localStorage` inline, for the reason
 * `sound-pref.ts` records: on a device that blocks site data (private mode, an enterprise
 * policy) `localStorage` **throws** rather than returning null, and an unguarded read inside a
 * render effect takes the whole screen to the error boundary. A language preference is a
 * convenience — it fails back to English, never to a crash.
 *
 * Read it in an effect, never at render time: the server has no way to know the stored value, so
 * using it for the first paint is a hydration mismatch (bugs #9 and #10).
 */
import type { GuideLang } from '@/lib/scheme-details';

export type { GuideLang };

const KEY = 'vikas75-explore-lang';

export function exploreLang(fallback: GuideLang = 'en'): GuideLang {
  try {
    const stored = typeof window === 'undefined' ? null : localStorage.getItem(KEY);
    return stored === 'hi' || stored === 'en' ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function setExploreLang(lang: GuideLang): void {
  try { localStorage.setItem(KEY, lang); } catch { /* blocked storage — this session only */ }
}
