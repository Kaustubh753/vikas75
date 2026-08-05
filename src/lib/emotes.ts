import type { EmoteId } from '@/types/game';

export const EMOTES: Record<EmoteId, { emoji: string; label: string; labelHi: string }> = {
  masterstroke: { emoji: '🧠', label: 'Masterstroke',  labelHi: 'मास्टरस्ट्रोक' },
  aatmanirbhar: { emoji: '🔧', label: 'Aatmanirbhar', labelHi: 'आत्मनिर्भर' },
  vishwaguru:   { emoji: '📡', label: 'Vishwaguru',   labelHi: 'विश्वगुरु' },
  '56inch':     { emoji: '💪', label: '56 Inch',      labelHi: '56 इंच' },
};

export const EMOTE_IDS = Object.keys(EMOTES) as EmoteId[];
