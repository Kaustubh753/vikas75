// Profanity filter for text that reaches a public projector at a government-adjacent event.
// Not a comprehensive solution — a determined person will always get something through — but it
// must at least catch the ordinary forms of the words it already claims to block.

/**
 * Roots that may carry an inflection. The suffix sets are EXPLICIT, never a wildcard: this deck
 * is about Indian government schemes and a `.{0,2}` tail would censor "Gandhi" (gand + hi),
 * which is very much worse than missing a swear word. Every root below is checked against the
 * false-positive list in `scripts/test-word-filter.mjs`.
 */
const EN_SUFFIX = '(?:s|es|ed|ing|in|er|ers|y|ies|ty)?';
/** Hinglish inflects on the vowel ending, and the compound forms take a postposition. */
const HI_SUFFIX = '(?:a|e|o|i|s|on|ke|ka|ki)?';

const EN_ROOTS = [
  'fuck', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'damn', 'crap',
  'cock', 'dick', 'pussy', 'asshole', 'jackass', 'dumbass', 'piss', 'slut', 'whore', 'wank',
];

const HI_ROOTS = [
  'chutiy', 'chutia', 'madarchod', 'bhenchod', 'behenchod', 'benchod', 'bhosdi', 'bhosda',
  'bhosdik', 'gaandu', 'gandu', 'harami', 'randi', 'lodu', 'chodu',
];

/**
 * Roots too short or too collision-prone to inflect — matched as whole words only.
 * `gand` in particular must never grow a suffix (Gandhi), and `ass` must not swallow
 * "assets"/"assess"/"class" — `\b` already handles those, but a suffix set would not.
 */
const EXACT_ONLY = ['ass', 'gand', 'chut', 'lund', 'saala', 'saale'];

/**
 * Invisible characters used to split a word so the matcher misses it, or to build a name that
 * takes a row on the leaderboard while showing nothing. The Hangul fillers are listed because
 * NFKC folds U+3164 to U+1160, which Unicode classifies as a LETTER — so a name made of them
 * passes any "does this contain a letter?" readability test.
 */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD\u034F\uFE00-\uFE0F\u180E\u115F\u1160\u3164\u2800\u17B4\u17B5]/g;

/** Cyrillic/Greek look-alikes NFKC does not fold. Mapped to their Latin twin before matching. */
const CONFUSABLES: Record<string, string> = {
  'а': 'a', 'е': 'e', 'о': 'o', 'с': 'c', 'р': 'p', 'х': 'x',
  'у': 'y', 'і': 'i', 'ѕ': 's', 'һ': 'h', 'ο': 'o', 'α': 'a',
  'А': 'A', 'Е': 'E', 'О': 'O', 'С': 'C', 'Р': 'P', 'Х': 'X',
};

const PATTERNS: RegExp[] = [
  ...EN_ROOTS.map((r) => new RegExp(`\\b${r}${EN_SUFFIX}\\b`, 'gi')),
  ...HI_ROOTS.map((r) => new RegExp(`\\b${r}${HI_SUFFIX}\\b`, 'gi')),
  ...EXACT_ONLY.map((r) => new RegExp(`\\b${r}\\b`, 'gi')),
];

function censorWord(word: string): string {
  // Every letter, not "first and last kept" — `s**t` and `f*****g` are perfectly legible at
  // projector size, which defeats the point of censoring them at all.
  return '*'.repeat(word.length);
}

/**
 * Normalise and censor. **This function expands its input** (NFKC turns one `㌖` into six
 * characters), so every caller must truncate AFTER calling it, never before — a 30-character
 * name of squared katakana otherwise stores 180 characters, and a 200-character explanation
 * stores 1200 while still counting as one word.
 */
export function filterText(text: string): string {
  const folded = text
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(/[Ѐ-ӿͰ-Ͽ]/g, (c) => CONFUSABLES[c] ?? c);

  let result = folded;
  for (const pattern of PATTERNS) result = result.replace(pattern, censorWord);
  return result;
}

/**
 * A display name safe to print on a projector: no control or formatting characters (a bare
 * `\n` or an RTL override reverses the text around it on the big screen), no invisible-only
 * names, and length-capped AFTER normalisation.
 */
export function sanitizeName(name: unknown, max = 30): string {
  if (typeof name !== 'string') return '';
  const cleaned = filterText(name)
    .replace(/[<>]/g, '')       // after NFKC, so fullwidth ＜＞ are stripped too
    .replace(/\p{Cc}/gu, ' ')   // control chars become a SPACE: a name with a newline is two
                                //  words, not one run-on word
    .replace(/\p{Cf}/gu, '')    // format chars (bidi overrides, joiners) just go
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
  // Must contain something a person can actually read — Hangul Filler and Braille Blank are
  // neither whitespace nor control characters, so a name of those alone would otherwise pass.
  return /\p{L}|\p{N}|\p{Emoji_Presentation}/u.test(cleaned) ? cleaned : '';
}
