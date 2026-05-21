import type { AvatarId } from '@/types/game';

export const AVATAR_BACKGROUNDS: Record<AvatarId, string> = {
  a1: '#1a3a6e',
  a2: '#8B1a1a',
  a3: '#138808',
  a4: '#4B0082',
  a5: '#2C3E50',
  a6: '#C0392B',
  a7: '#E67E22',
  a8: '#16A085',
  a9: '#2C2C2A',
};

export const AVATAR_NAMES: Record<AvatarId, string> = {
  a1: 'Turban Singh',
  a2: 'Saree Devi',
  a3: 'Kurta Bhai',
  a4: 'Dupatta Ji',
  a5: 'Officer Sahab',
  a6: 'Ponytail Didi',
  a7: 'Cap Wale',
  a8: 'Braid Bhabhi',
  a9: 'Chashmish',
};

// Each avatar is a 64×64 pixel-art SVG. High contrast character on solid background.

const avatarSvgs: Record<AvatarId, (size: number) => React.ReactElement> = {
  // a1 — Navy bg — Male, orange turban, white kurta
  a1: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#1a3a6e"/>
      {/* turban */}
      <rect x="14" y="4" width="36" height="6" fill="#E67E22"/>
      <rect x="16" y="8" width="32" height="8" fill="#FF9933"/>
      <rect x="12" y="14" width="40" height="4" fill="#CC6600"/>
      {/* face */}
      <rect x="18" y="16" width="28" height="20" fill="#F5C589"/>
      {/* eyes */}
      <rect x="22" y="22" width="5" height="4" fill="#1C1C1C"/>
      <rect x="37" y="22" width="5" height="4" fill="#1C1C1C"/>
      {/* eyebrows */}
      <rect x="21" y="19" width="7" height="2" fill="#6B3A2A"/>
      <rect x="36" y="19" width="7" height="2" fill="#6B3A2A"/>
      {/* nose */}
      <rect x="30" y="28" width="4" height="3" fill="#D4956A"/>
      {/* mouth smile */}
      <rect x="24" y="33" width="16" height="3" fill="#C0392B"/>
      <rect x="22" y="32" width="4" height="2" fill="#F5C589"/>
      <rect x="38" y="32" width="4" height="2" fill="#F5C589"/>
      {/* neck */}
      <rect x="26" y="36" width="12" height="6" fill="#F5C589"/>
      {/* body kurta */}
      <rect x="10" y="42" width="44" height="22" fill="#FFFFFF"/>
      {/* kurta collar */}
      <rect x="26" y="42" width="12" height="10" fill="#FF9933"/>
      <rect x="30" y="42" width="4" height="22" fill="#F0F0F0"/>
    </svg>
  ),
  // a2 — Deep red bg — Female, hair bun, yellow saree
  a2: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#8B1a1a"/>
      {/* hair bun */}
      <rect x="22" y="2" width="20" height="8" fill="#1C1C1C"/>
      <rect x="20" y="8" width="24" height="6" fill="#1C1C1C"/>
      {/* hair sides */}
      <rect x="14" y="14" width="6" height="16" fill="#1C1C1C"/>
      <rect x="44" y="14" width="6" height="16" fill="#1C1C1C"/>
      {/* face */}
      <rect x="18" y="14" width="28" height="22" fill="#F5C589"/>
      {/* bindi */}
      <rect x="30" y="17" width="4" height="4" fill="#CC0000"/>
      {/* eyes with kajal */}
      <rect x="20" y="22" width="7" height="4" fill="#1C1C1C"/>
      <rect x="37" y="22" width="7" height="4" fill="#1C1C1C"/>
      <rect x="18" y="22" width="3" height="2" fill="#1C1C1C"/>
      <rect x="43" y="22" width="3" height="2" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="29" width="4" height="3" fill="#D4956A"/>
      {/* lips */}
      <rect x="24" y="33" width="16" height="4" fill="#CC3366"/>
      {/* neck */}
      <rect x="26" y="36" width="12" height="6" fill="#F5C589"/>
      {/* necklace */}
      <rect x="22" y="40" width="20" height="3" fill="#FFD700"/>
      {/* body saree */}
      <rect x="10" y="42" width="44" height="22" fill="#FFD700"/>
      <rect x="10" y="42" width="44" height="8" fill="#D4A017"/>
      {/* saree border */}
      <rect x="10" y="50" width="44" height="3" fill="#CC6600"/>
    </svg>
  ),
  // a3 — Forest green bg — Male, dark short hair, white kurta
  a3: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#138808"/>
      {/* hair */}
      <rect x="16" y="4" width="32" height="12" fill="#1C1C1C"/>
      <rect x="14" y="10" width="4" height="8" fill="#1C1C1C"/>
      <rect x="46" y="10" width="4" height="8" fill="#1C1C1C"/>
      {/* face */}
      <rect x="18" y="14" width="28" height="24" fill="#F5C589"/>
      {/* eyes */}
      <rect x="22" y="22" width="6" height="4" fill="#1C1C1C"/>
      <rect x="36" y="22" width="6" height="4" fill="#1C1C1C"/>
      {/* eyebrows */}
      <rect x="21" y="19" width="8" height="2" fill="#1C1C1C"/>
      <rect x="35" y="19" width="8" height="2" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="29" width="4" height="4" fill="#D4956A"/>
      {/* smile */}
      <rect x="25" y="34" width="14" height="3" fill="#C0392B"/>
      {/* chin */}
      <rect x="18" y="36" width="28" height="2" fill="#E8B17A"/>
      {/* neck */}
      <rect x="26" y="38" width="12" height="6" fill="#F5C589"/>
      {/* white kurta */}
      <rect x="10" y="44" width="44" height="20" fill="#FFFFFF"/>
      <rect x="26" y="44" width="12" height="8" fill="#EEEEEE"/>
      <rect x="30" y="44" width="4" height="20" fill="#E5E5E5"/>
    </svg>
  ),
  // a4 — Purple bg — Female, topknot bun, pink outfit
  a4: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#4B0082"/>
      {/* hair topknot */}
      <rect x="26" y="2" width="12" height="10" fill="#6B3A2A"/>
      <rect x="22" y="10" width="20" height="6" fill="#6B3A2A"/>
      {/* hair framing face */}
      <rect x="14" y="14" width="6" height="18" fill="#6B3A2A"/>
      <rect x="44" y="14" width="6" height="18" fill="#6B3A2A"/>
      {/* face */}
      <rect x="18" y="14" width="28" height="22" fill="#F5C589"/>
      {/* bindi gold */}
      <rect x="30" y="17" width="4" height="4" fill="#FFD700"/>
      {/* eyes */}
      <rect x="21" y="22" width="7" height="4" fill="#1C1C1C"/>
      <rect x="36" y="22" width="7" height="4" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="28" width="4" height="3" fill="#D4956A"/>
      {/* pink lips */}
      <rect x="24" y="32" width="16" height="4" fill="#E91E8C"/>
      {/* neck */}
      <rect x="26" y="36" width="12" height="6" fill="#F5C589"/>
      {/* dupatta */}
      <rect x="6" y="40" width="52" height="6" fill="#FF80C0"/>
      {/* body suit */}
      <rect x="12" y="46" width="40" height="18" fill="#FF69B4"/>
      <rect x="12" y="46" width="40" height="6" fill="#E91E8C"/>
    </svg>
  ),
  // a5 — Dark slate bg — Male, mustache, khaki uniform
  a5: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#2C3E50"/>
      {/* short dark hair */}
      <rect x="16" y="4" width="32" height="10" fill="#1C1C1C"/>
      <rect x="14" y="10" width="4" height="6" fill="#1C1C1C"/>
      <rect x="46" y="10" width="4" height="6" fill="#1C1C1C"/>
      {/* face */}
      <rect x="18" y="12" width="28" height="26" fill="#C68642"/>
      {/* eyes */}
      <rect x="22" y="20" width="6" height="4" fill="#1C1C1C"/>
      <rect x="36" y="20" width="6" height="4" fill="#1C1C1C"/>
      {/* eyebrows (stern) */}
      <rect x="20" y="17" width="10" height="3" fill="#1C1C1C"/>
      <rect x="34" y="17" width="10" height="3" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="26" width="4" height="5" fill="#A8722A"/>
      {/* thick mustache */}
      <rect x="22" y="30" width="20" height="6" fill="#1C1C1C"/>
      <rect x="24" y="32" width="6" height="4" fill="#1C1C1C"/>
      <rect x="34" y="32" width="6" height="4" fill="#1C1C1C"/>
      {/* mouth below mustache */}
      <rect x="26" y="36" width="12" height="3" fill="#8B5A2B"/>
      {/* neck */}
      <rect x="26" y="38" width="12" height="6" fill="#C68642"/>
      {/* khaki uniform */}
      <rect x="10" y="44" width="44" height="20" fill="#C5B073"/>
      <rect x="10" y="44" width="44" height="6" fill="#B5A063"/>
      {/* belt */}
      <rect x="10" y="52" width="44" height="4" fill="#5D4037"/>
      {/* epaulette */}
      <rect x="10" y="44" width="8" height="8" fill="#A09060"/>
      <rect x="46" y="44" width="8" height="8" fill="#A09060"/>
    </svg>
  ),
  // a6 — Crimson bg — Female, side ponytail, blue dress
  a6: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#C0392B"/>
      {/* hair main */}
      <rect x="14" y="6" width="36" height="12" fill="#1C1C1C"/>
      <rect x="12" y="14" width="6" height="16" fill="#1C1C1C"/>
      {/* side ponytail right */}
      <rect x="48" y="10" width="8" height="24" fill="#1C1C1C"/>
      <rect x="50" y="32" width="6" height="8" fill="#1C1C1C"/>
      <rect x="48" y="38" width="4" height="4" fill="#1C1C1C"/>
      {/* face */}
      <rect x="16" y="16" width="30" height="22" fill="#F5C589"/>
      {/* blush */}
      <rect x="17" y="28" width="7" height="5" fill="#F4A0A0"/>
      <rect x="38" y="28" width="7" height="5" fill="#F4A0A0"/>
      {/* eyes */}
      <rect x="21" y="22" width="7" height="4" fill="#1C1C1C"/>
      <rect x="35" y="22" width="7" height="4" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="29" y="28" width="4" height="3" fill="#D4956A"/>
      {/* lips */}
      <rect x="23" y="33" width="16" height="4" fill="#CC3366"/>
      {/* neck */}
      <rect x="25" y="38" width="12" height="6" fill="#F5C589"/>
      {/* blue dress */}
      <rect x="10" y="44" width="44" height="20" fill="#3498DB"/>
      <rect x="10" y="44" width="44" height="6" fill="#2980B9"/>
      {/* neckline detail */}
      <rect x="22" y="44" width="20" height="8" fill="#2980B9"/>
    </svg>
  ),
  // a7 — Burnt orange bg — Male, navy cap, green kurta
  a7: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#E67E22"/>
      {/* cap */}
      <rect x="12" y="4" width="40" height="14" fill="#1a3a6e"/>
      <rect x="8" y="16" width="48" height="4" fill="#0f2347"/>
      {/* cap badge */}
      <rect x="28" y="6" width="8" height="6" fill="#FFD700"/>
      {/* face */}
      <rect x="18" y="18" width="28" height="22" fill="#F5C589"/>
      {/* ears */}
      <rect x="14" y="20" width="4" height="8" fill="#F5C589"/>
      <rect x="46" y="20" width="4" height="8" fill="#F5C589"/>
      {/* eyes */}
      <rect x="22" y="24" width="6" height="4" fill="#1C1C1C"/>
      <rect x="36" y="24" width="6" height="4" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="30" width="4" height="4" fill="#D4956A"/>
      {/* smile */}
      <rect x="24" y="36" width="16" height="3" fill="#C0392B"/>
      <rect x="22" y="35" width="4" height="2" fill="#F5C589"/>
      <rect x="38" y="35" width="4" height="2" fill="#F5C589"/>
      {/* neck */}
      <rect x="26" y="40" width="12" height="4" fill="#F5C589"/>
      {/* green kurta */}
      <rect x="10" y="44" width="44" height="20" fill="#27AE60"/>
      <rect x="24" y="44" width="16" height="10" fill="#219A52"/>
      <rect x="30" y="44" width="4" height="20" fill="#1E8449"/>
    </svg>
  ),
  // a8 — Teal bg — Female, braids, yellow outfit
  a8: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#16A085"/>
      {/* hair top */}
      <rect x="16" y="4" width="32" height="10" fill="#1C1C1C"/>
      {/* braid left */}
      <rect x="8" y="12" width="8" height="30" fill="#1C1C1C"/>
      <rect x="10" y="40" width="6" height="8" fill="#1C1C1C"/>
      <rect x="12" y="46" width="4" height="6" fill="#1C1C1C"/>
      {/* braid right */}
      <rect x="48" y="12" width="8" height="30" fill="#1C1C1C"/>
      <rect x="48" y="40" width="6" height="8" fill="#1C1C1C"/>
      <rect x="48" y="46" width="4" height="6" fill="#1C1C1C"/>
      {/* face */}
      <rect x="18" y="12" width="28" height="24" fill="#F5C589"/>
      {/* bindi */}
      <rect x="30" y="15" width="4" height="4" fill="#CC0000"/>
      {/* eyes */}
      <rect x="21" y="21" width="7" height="4" fill="#1C1C1C"/>
      <rect x="36" y="21" width="7" height="4" fill="#1C1C1C"/>
      {/* nose */}
      <rect x="30" y="27" width="4" height="3" fill="#D4956A"/>
      {/* smile */}
      <rect x="23" y="31" width="18" height="4" fill="#CC3366"/>
      {/* neck */}
      <rect x="26" y="36" width="12" height="6" fill="#F5C589"/>
      {/* yellow outfit */}
      <rect x="14" y="42" width="36" height="22" fill="#F1C40F"/>
      <rect x="14" y="42" width="36" height="8" fill="#D4AC0D"/>
      {/* dupatta orange */}
      <rect x="6" y="42" width="52" height="4" fill="#E67E22"/>
    </svg>
  ),
  // a9 — Charcoal bg — Male, glasses, red shirt
  a9: (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect width="64" height="64" fill="#2C2C2A"/>
      {/* hair */}
      <rect x="16" y="4" width="32" height="10" fill="#1C1C1C"/>
      <rect x="14" y="10" width="4" height="6" fill="#1C1C1C"/>
      <rect x="46" y="10" width="4" height="6" fill="#1C1C1C"/>
      {/* face */}
      <rect x="18" y="12" width="28" height="26" fill="#F5C589"/>
      {/* glasses frames */}
      <rect x="18" y="19" width="13" height="9" rx="0" fill="none" stroke="#CCCCCC" strokeWidth="2"/>
      <rect x="33" y="19" width="13" height="9" fill="none" stroke="#CCCCCC" strokeWidth="2"/>
      {/* glasses bridge */}
      <rect x="31" y="22" width="2" height="2" fill="#CCCCCC"/>
      {/* eyes inside glasses */}
      <rect x="21" y="21" width="5" height="4" fill="#1C1C1C"/>
      <rect x="36" y="21" width="5" height="4" fill="#1C1C1C"/>
      {/* glasses arms */}
      <rect x="14" y="21" width="4" height="2" fill="#CCCCCC"/>
      <rect x="46" y="21" width="4" height="2" fill="#CCCCCC"/>
      {/* nose */}
      <rect x="30" y="29" width="4" height="4" fill="#D4956A"/>
      {/* slight smile */}
      <rect x="25" y="35" width="14" height="3" fill="#A0522D"/>
      {/* neck */}
      <rect x="26" y="38" width="12" height="6" fill="#F5C589"/>
      {/* red shirt */}
      <rect x="10" y="44" width="44" height="20" fill="#E74C3C"/>
      {/* collar */}
      <rect x="22" y="44" width="10" height="8" fill="#C0392B"/>
      <rect x="32" y="44" width="10" height="8" fill="#C0392B"/>
      <rect x="30" y="44" width="4" height="20" fill="#CB4335"/>
    </svg>
  ),
};

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
}

export default function Avatar({ id, size = 48, className = '' }: AvatarProps) {
  const render = avatarSvgs[id];
  if (!render) return null;
  return (
    <span
      className={`inline-block rounded-lg overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {render(size)}
    </span>
  );
}

export const ALL_AVATAR_IDS: AvatarId[] = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'];
