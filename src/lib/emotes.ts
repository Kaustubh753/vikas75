import type { EmoteId } from '@/types/game';

export const EMOTES: Record<EmoteId, { emoji: string; label: string; labelHi: string }> = {
  masterstroke: { emoji: '🧠', label: 'Masterstroke',  labelHi: 'मास्टरस्ट्रोक' },
  aatmanirbhar: { emoji: '🔧', label: 'Aatmanirbhar', labelHi: 'आत्मनिर्भर' },
  vishwaguru:   { emoji: '📡', label: 'Vishwaguru',   labelHi: 'विश्वगुरु' },
  '56inch':     { emoji: '💪', label: '56 Inch',      labelHi: '56 इंच' },
};

export const EMOTE_IDS = Object.keys(EMOTES) as EmoteId[];

/**
 * Membership test that also narrows the type, so the API's validation of an untrusted `emote`
 * string is the same statement that lets it be broadcast as an `EmoteId`. The check was
 * previously an `includes` through a `string[]` cast, which validated at runtime but left the
 * value typed `string` — the broadcast payload only looked well-typed.
 */
export function isEmoteId(value: unknown): value is EmoteId {
  return typeof value === 'string' && Object.hasOwn(EMOTES, value);
}
