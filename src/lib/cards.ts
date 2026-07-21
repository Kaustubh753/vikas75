/**
 * Physical card image helpers.
 *
 * Mapping:
 *   Challenge c001–c030  →  /cards/card-001.webp … card-030.webp  (blue/navy cards)
 *   Scheme    s001–s075  →  /cards/card-031.webp … card-105.webp  (cream/white cards)
 */

/** "/cards/card-001.webp" for id "c001", "/cards/card-030.webp" for "c030", etc. */
export function getChallengeCardImage(id: string): string {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  if (isNaN(n) || n < 1 || n > 30) return '/cards/card-001.webp'; // safe fallback
  return `/cards/card-${String(n).padStart(3, '0')}.webp`;
}

/** "/cards/card-031.webp" for id "s001", "/cards/card-105.webp" for "s075", etc. */
export function getSchemeCardImage(id: string): string {
  const n = parseInt(id.replace(/\D/g, ''), 10);
  if (isNaN(n) || n < 1 || n > 75) return '/cards/card-031.webp'; // safe fallback
  return `/cards/card-${String(n + 30).padStart(3, '0')}.webp`;
}

/** 1×1 navy (#0d1b35) SVG — blur placeholder for challenge cards */
export const BLUR_NAVY =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IGZpbGw9IiMwZDFiMzUiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L3N2Zz4=';

/** 1×1 cream (#faf8f0) SVG — blur placeholder for scheme cards */
export const BLUR_CREAM =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IGZpbGw9IiNmYWY4ZjAiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L3N2Zz4=';
