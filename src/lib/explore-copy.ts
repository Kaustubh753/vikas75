/**
 * Every word the Explore screens put on screen, in both languages.
 *
 * It is a `Record<GuideLang, Copy>`, so adding a string to one language and forgetting the other
 * is a compile error rather than a stray English sentence in the middle of a Hindi page. Two
 * things are deliberately NOT in here:
 *
 * - The scheme names and one-line descriptions. Those live in `context/cards_schemes.json` with
 *   the cards, where the game already reads them (`name` + `hi`). There is no Hindi `desc` in
 *   that data, so the Hindi screens show the Hindi *name* as the heading and fall back to the
 *   English one-liner underneath — the guide page itself, which is the thing being read, is
 *   fully in Hindi.
 * - The card art. `public/cards/*.webp` is the printed deck, English-faced in both modes,
 *   because that is the physical card a player is holding at the table.
 */
import type { GuideLang } from '@/lib/scheme-details';

export interface ExploreCopy {
  /** Sticky header. */
  back: string;
  explore: string;
  /** The language toggle's own labels — each in its OWN language, never translated. */
  langSwitchLabel: string;
  /** Deck header. */
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  clearSearch: string;
  /** `n` matches out of `total` for `q`. */
  matchCount: (n: number, total: number, q: string) => string;
  deckCount: (total: number) => string;
  noMatch: (q: string) => string;
  openGuide: string;
  tileAria: (name: string) => string;
  /** The keyboard primer under the grid. */
  hintLead: string;
  hintMove: string;
  hintZoom: string;
  hintBack: string;
  /** Reader. */
  guideAria: (name: string) => string;
  /** "Card 07 of 75" above the scheme's name. */
  cardCounter: (n: string, total: number) => string;
  prevScheme: string;
  nextScheme: string;
  closeGuide: string;
  zoomIn: string;
  zoomInPhone: string;
  zoomed: string;
  disclaimer: string;
  keyScheme: string;
  keyFit: string;
  keyZoom: string;
  keyDeck: string;
  /** Card-detail fallback, for the one card with no guide. */
  keyPoints: string;
  close: string;
}

export const EXPLORE_COPY: Record<GuideLang, ExploreCopy> = {
  en: {
    back: 'Vikas 75',
    explore: 'Explore',
    langSwitchLabel: 'हिंदी',
    title: 'Know Your Deck',
    subtitle: 'अपनी डेक जानें',
    searchPlaceholder: 'Search schemes…',
    clearSearch: 'Clear search',
    matchCount: (n, total, q) => `${n} of ${total} match “${q}”`,
    deckCount: (total) => `${total} schemes in the deck`,
    noMatch: (q) => `No schemes match “${q}”`,
    openGuide: 'Read the guide →',
    tileAria: (name) => `${name} — open scheme guide`,
    hintLead: 'Tap a card to open its scheme guide. Then',
    hintMove: 'to move between schemes,',
    hintZoom: 'to zoom,',
    hintBack: 'to come back here.',
    guideAria: (name) => `${name} — scheme guide`,
    cardCounter: (n, total) => `Card ${n} of ${total}`,
    prevScheme: 'Previous scheme',
    nextScheme: 'Next scheme',
    closeGuide: 'Close scheme guide',
    zoomIn: 'Click to read full size',
    zoomInPhone: 'Tap to read full size',
    zoomed: 'Zoomed — drag to read, Esc to fit',
    disclaimer: 'Details are for general awareness. Always confirm on the official portal linked in the guide.',
    keyScheme: 'scheme',
    keyFit: 'fit',
    keyZoom: 'zoom',
    keyDeck: 'deck',
    keyPoints: 'Key points',
    close: 'Close',
  },
  hi: {
    back: 'विकास 75',
    explore: 'योजनाएँ',
    langSwitchLabel: 'English',
    title: 'अपनी डेक जानें',
    subtitle: 'Know Your Deck',
    searchPlaceholder: 'योजना खोजें…',
    clearSearch: 'खोज हटाएँ',
    // Devanagari digits would be the purer choice, but the deck's own guide pages print Latin
    // numerals throughout, so these match what the reader sees a tap later.
    matchCount: (n, total, q) => `${total} में से ${n} “${q}” से मेल खाती हैं`,
    deckCount: (total) => `डेक में ${total} योजनाएँ`,
    noMatch: (q) => `“${q}” से कोई योजना मेल नहीं खाती`,
    openGuide: 'मार्गदर्शिका पढ़ें →',
    tileAria: (name) => `${name} — योजना की मार्गदर्शिका खोलें`,
    hintLead: 'किसी कार्ड पर टैप करके उसकी मार्गदर्शिका खोलें। फिर',
    hintMove: 'से योजनाएँ बदलें,',
    hintZoom: 'से बड़ा करें,',
    hintBack: 'से वापस आएँ।',
    guideAria: (name) => `${name} — योजना की मार्गदर्शिका`,
    cardCounter: (n, total) => `कार्ड ${n} / ${total}`,
    prevScheme: 'पिछली योजना',
    nextScheme: 'अगली योजना',
    closeGuide: 'मार्गदर्शिका बंद करें',
    zoomIn: 'पूरे आकार में पढ़ने के लिए क्लिक करें',
    zoomInPhone: 'पूरे आकार में पढ़ने के लिए टैप करें',
    zoomed: 'बड़ा किया — पढ़ने के लिए खींचें, Esc से वापस',
    disclaimer: 'यह जानकारी सामान्य जागरूकता के लिए है। मार्गदर्शिका में दिए आधिकारिक पोर्टल पर ज़रूर पुष्टि करें।',
    keyScheme: 'योजना',
    keyFit: 'वापस',
    keyZoom: 'बड़ा',
    keyDeck: 'डेक',
    keyPoints: 'मुख्य बिंदु',
    close: 'बंद करें',
  },
};
