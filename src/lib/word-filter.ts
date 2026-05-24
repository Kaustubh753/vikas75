// Basic profanity filter — replaces bad words with asterisks.
// Intentionally kept simple; comprehensive filtering requires a proper library.

const BAD_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'bastard', 'damn', 'crap', 'cock', 'dick', 'pussy',
  'asshole', 'motherfucker', 'fucker', 'bullshit', 'jackass', 'piss', 'slut', 'whore',
  // Hinglish/Hindi transliterations
  'chutiya', 'madarchod', 'bhenchod', 'gaandu', 'saala', 'harami', 'randi', 'bhosdike',
  'chut', 'lund', 'gand',
];

function censorWord(word: string): string {
  if (word.length <= 2) return word;
  return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
}

export function filterText(text: string): string {
  // Normalise to NFKC (collapses Unicode homoglyphs: ａ→a, ｆ→f, Cyrillic lookalikes, etc.)
  // and strip zero-width characters used to split words and bypass filters.
  const normalised = text
    .normalize('NFKC')
    .replace(/[​-‍﻿­]/g, '');

  let result = normalised;
  for (const bad of BAD_WORDS) {
    // Case-insensitive exact word match — \bword\b avoids false positives like "assets" matching "ass"
    const regex = new RegExp(`\\b${bad}\\b`, 'gi');
    result = result.replace(regex, (match) => censorWord(match));
  }
  return result;
}
