import type { EmoteId } from '@/types/game';

export const EMOTES: Record<EmoteId, { emoji: string; label: string; labelHi: string }> = {
  masterstroke:  { emoji: '🧠', label: 'Masterstroke',  labelHi: 'मास्टरस्ट्रोक' },
  aatmanirbhar: { emoji: '🔧', label: 'Aatmanirbhar', labelHi: 'आत्मनिर्भर' },
  vishwaguru:   { emoji: '📡', label: 'Vishwaguru',   labelHi: 'विश्वगुरु' },
  fakir:        { emoji: '🚨', label: 'Fakir Mode',   labelHi: 'फ़कीर मोड' },
  antinational: { emoji: '📵', label: 'Anti-national', labelHi: 'देशद्रोही' },
  '56inch':     { emoji: '💪', label: '56 Inch',      labelHi: '56 इंच' },
};

export const EMOTE_IDS = Object.keys(EMOTES) as EmoteId[];
