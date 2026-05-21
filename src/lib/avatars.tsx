import type { AvatarId } from '@/types/game';

export const AVATAR_BACKGROUNDS: Record<AvatarId, string> = {
  a1: '#1a3a6e',
  a2: '#8B1a1a',
  a3: '#138808',
  a4: '#4B0082',
  a5: '#C0392B',
  a6: '#E67E22',
  a7: '#16A085',
  a8: '#2C3E50',
  a9: '#7B2D8B',
};

export const AVATAR_NAMES: Record<AvatarId, string> = {
  a1: 'Turban Singh',
  a2: 'Saree Devi',
  a3: 'Kurta Bhai',
  a4: 'Dupatta Ji',
  a5: 'Officer Sahab',
  a6: 'Student',
  a7: 'Doctor Ji',
  a8: 'Scientist',
  a9: 'Dancer',
};

export const ALL_AVATAR_IDS: AvatarId[] = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'];

// Pixel art SVGs using <rect> elements on 64x64 viewBox
const AVATAR_SVGS: Record<AvatarId, React.ReactElement> = {
  // a1: Turban Singh — blue turban, brown skin, white kurta, dark beard
  a1: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Turban */}
      <rect x="14" y="6" width="36" height="6" fill="#2255CC" />
      <rect x="12" y="10" width="40" height="8" fill="#3366DD" />
      <rect x="10" y="16" width="44" height="4" fill="#2255CC" />
      {/* Face */}
      <rect x="18" y="18" width="28" height="20" fill="#8B5E3C" />
      {/* Eyes */}
      <rect x="22" y="24" width="6" height="5" fill="#111" />
      <rect x="36" y="24" width="6" height="5" fill="#111" />
      <rect x="24" y="25" width="2" height="3" fill="#fff" />
      <rect x="38" y="25" width="2" height="3" fill="#fff" />
      {/* Beard */}
      <rect x="18" y="34" width="28" height="8" fill="#222" />
      {/* Moustache */}
      <rect x="22" y="32" width="20" height="3" fill="#111" />
      {/* Kurta body */}
      <rect x="14" y="42" width="36" height="20" fill="#F0EEE4" />
      {/* Kurta collar */}
      <rect x="28" y="42" width="8" height="8" fill="#DDD8CC" />
      {/* Arms */}
      <rect x="6" y="42" width="8" height="18" fill="#F0EEE4" />
      <rect x="50" y="42" width="8" height="18" fill="#F0EEE4" />
      {/* Hands */}
      <rect x="6" y="58" width="8" height="6" fill="#8B5E3C" />
      <rect x="50" y="58" width="8" height="6" fill="#8B5E3C" />
    </svg>
  ),

  // a2: Saree Devi — red saree, bindi, black hair bun, gold earrings
  a2: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Hair bun */}
      <rect x="20" y="4" width="24" height="14" fill="#111" />
      <rect x="26" y="2" width="12" height="8" fill="#111" />
      {/* Face */}
      <rect x="18" y="16" width="28" height="20" fill="#C68642" />
      {/* Bindi */}
      <rect x="30" y="18" width="4" height="4" fill="#CC0000" />
      {/* Eyes */}
      <rect x="21" y="23" width="6" height="5" fill="#111" />
      <rect x="37" y="23" width="6" height="5" fill="#111" />
      <rect x="23" y="24" width="2" height="3" fill="#fff" />
      <rect x="39" y="24" width="2" height="3" fill="#fff" />
      {/* Lips */}
      <rect x="26" y="32" width="12" height="4" fill="#CC3333" />
      {/* Gold earrings */}
      <rect x="14" y="22" width="5" height="8" fill="#FFD700" />
      <rect x="45" y="22" width="5" height="8" fill="#FFD700" />
      {/* Saree body */}
      <rect x="12" y="36" width="40" height="28" fill="#CC1111" />
      {/* Saree border gold */}
      <rect x="12" y="36" width="40" height="3" fill="#FFD700" />
      <rect x="12" y="61" width="40" height="3" fill="#FFD700" />
      {/* Blouse */}
      <rect x="18" y="36" width="28" height="10" fill="#880000" />
      {/* Pallu drape */}
      <rect x="6" y="36" width="10" height="28" fill="#AA0000" />
    </svg>
  ),

  // a3: Kurta Bhai — white kurta, brown skin, black hair, Gandhi cap
  a3: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Gandhi cap */}
      <rect x="16" y="8" width="32" height="5" fill="#F5F5F5" />
      <rect x="18" y="6" width="28" height="4" fill="#F5F5F5" />
      <rect x="22" y="4" width="20" height="4" fill="#F5F5F5" />
      {/* Hair */}
      <rect x="16" y="12" width="32" height="4" fill="#111" />
      {/* Face */}
      <rect x="18" y="14" width="28" height="22" fill="#8B5E3C" />
      {/* Eyes */}
      <rect x="22" y="20" width="6" height="5" fill="#111" />
      <rect x="36" y="20" width="6" height="5" fill="#111" />
      <rect x="24" y="21" width="2" height="3" fill="#fff" />
      <rect x="38" y="21" width="2" height="3" fill="#fff" />
      {/* Glasses */}
      <rect x="20" y="19" width="10" height="8" fill="none" stroke="#555" strokeWidth="1.5" />
      <rect x="34" y="19" width="10" height="8" fill="none" stroke="#555" strokeWidth="1.5" />
      <rect x="30" y="22" width="4" height="2" fill="#555" />
      {/* Smile */}
      <rect x="24" y="30" width="16" height="4" fill="#7A4A28" />
      {/* White Kurta */}
      <rect x="14" y="38" width="36" height="26" fill="#FFFFFF" />
      {/* Kurta buttons */}
      <rect x="30" y="40" width="4" height="22" fill="#DDDDDD" />
      <rect x="30" y="43" width="4" height="2" fill="#888" />
      <rect x="30" y="49" width="4" height="2" fill="#888" />
      <rect x="30" y="55" width="4" height="2" fill="#888" />
      {/* Arms */}
      <rect x="6" y="38" width="8" height="20" fill="#FFFFFF" />
      <rect x="50" y="38" width="8" height="20" fill="#FFFFFF" />
      {/* Hands */}
      <rect x="6" y="56" width="8" height="8" fill="#8B5E3C" />
      <rect x="50" y="56" width="8" height="8" fill="#8B5E3C" />
    </svg>
  ),

  // a4: Dupatta Ji — dupatta, light kurta, braid hair
  a4: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Braid hair */}
      <rect x="18" y="4" width="28" height="14" fill="#2C1A0E" />
      <rect x="44" y="14" width="8" height="30" fill="#2C1A0E" />
      <rect x="46" y="12" width="6" height="34" fill="#3D2310" />
      {/* Face */}
      <rect x="18" y="16" width="28" height="20" fill="#D4956A" />
      {/* Bindi */}
      <rect x="30" y="18" width="4" height="4" fill="#8B0000" />
      {/* Eyes */}
      <rect x="21" y="23" width="6" height="5" fill="#111" />
      <rect x="37" y="23" width="6" height="5" fill="#111" />
      <rect x="23" y="24" width="2" height="3" fill="#fff" />
      <rect x="39" y="24" width="2" height="3" fill="#fff" />
      {/* Lips */}
      <rect x="26" y="32" width="12" height="3" fill="#CC6688" />
      {/* Earrings */}
      <rect x="14" y="22" width="4" height="6" fill="#FF69B4" />
      <rect x="46" y="22" width="4" height="6" fill="#FF69B4" />
      {/* Light kurta */}
      <rect x="14" y="38" width="36" height="26" fill="#E8D5C4" />
      {/* Dupatta */}
      <rect x="6" y="36" width="52" height="6" fill="#9B59B6" />
      <rect x="6" y="36" width="52" height="2" fill="#6C3483" />
      <rect x="6" y="40" width="52" height="2" fill="#6C3483" />
      <rect x="6" y="42" width="16" height="20" fill="#9B59B6" />
      {/* Kurta embroidery */}
      <rect x="22" y="46" width="20" height="2" fill="#C39BD3" />
      <rect x="22" y="52" width="20" height="2" fill="#C39BD3" />
    </svg>
  ),

  // a5: Officer Sahab — khaki uniform, cap, moustache
  a5: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Officer cap */}
      <rect x="12" y="8" width="40" height="5" fill="#5D4037" />
      <rect x="10" y="11" width="44" height="6" fill="#6D4C41" />
      <rect x="8" y="15" width="48" height="3" fill="#4E342E" />
      {/* Cap badge */}
      <rect x="28" y="10" width="8" height="4" fill="#FFD700" />
      {/* Face */}
      <rect x="18" y="17" width="28" height="20" fill="#C68642" />
      {/* Eyes */}
      <rect x="22" y="23" width="6" height="5" fill="#111" />
      <rect x="36" y="23" width="6" height="5" fill="#111" />
      <rect x="24" y="24" width="2" height="3" fill="#fff" />
      <rect x="38" y="24" width="2" height="3" fill="#fff" />
      {/* Moustache */}
      <rect x="22" y="31" width="10" height="4" fill="#111" />
      <rect x="32" y="31" width="10" height="4" fill="#111" />
      {/* Khaki uniform */}
      <rect x="14" y="38" width="36" height="26" fill="#C8B560" />
      {/* Uniform details */}
      <rect x="26" y="38" width="12" height="20" fill="#B8A550" />
      {/* Badges */}
      <rect x="16" y="42" width="8" height="6" fill="#FFD700" />
      <rect x="40" y="42" width="8" height="6" fill="#FFD700" />
      {/* Belt */}
      <rect x="14" y="56" width="36" height="4" fill="#5D4037" />
      {/* Arms */}
      <rect x="6" y="38" width="8" height="20" fill="#C8B560" />
      <rect x="50" y="38" width="8" height="20" fill="#C8B560" />
    </svg>
  ),

  // a6: Student — backpack, jeans, glasses, short hair
  a6: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Short hair */}
      <rect x="18" y="6" width="28" height="12" fill="#3D2B1F" />
      <rect x="14" y="10" width="36" height="6" fill="#3D2B1F" />
      {/* Face */}
      <rect x="18" y="16" width="28" height="20" fill="#FDBCB4" />
      {/* Eyes */}
      <rect x="21" y="22" width="6" height="5" fill="#111" />
      <rect x="37" y="22" width="6" height="5" fill="#111" />
      {/* Glasses */}
      <rect x="19" y="21" width="10" height="8" fill="none" stroke="#333" strokeWidth="1.5" />
      <rect x="35" y="21" width="10" height="8" fill="none" stroke="#333" strokeWidth="1.5" />
      <rect x="29" y="24" width="6" height="2" fill="#333" />
      {/* Smile */}
      <rect x="24" y="30" width="16" height="3" fill="#E89070" />
      {/* T-shirt */}
      <rect x="18" y="38" width="28" height="16" fill="#FF6B35" />
      <rect x="18" y="38" width="28" height="4" fill="#E55A22" />
      {/* Jeans */}
      <rect x="18" y="52" width="28" height="12" fill="#2980B9" />
      <rect x="30" y="52" width="4" height="12" fill="#2471A3" />
      {/* Backpack straps */}
      <rect x="6" y="36" width="8" height="26" fill="#27AE60" />
      <rect x="50" y="36" width="8" height="26" fill="#27AE60" />
      {/* Backpack main */}
      <rect x="8" y="36" width="10" height="22" fill="#2ECC71" />
      {/* Hands */}
      <rect x="6" y="58" width="8" height="6" fill="#FDBCB4" />
      <rect x="50" y="58" width="8" height="6" fill="#FDBCB4" />
    </svg>
  ),

  // a7: Doctor Ji — white coat, stethoscope, bindi, ponytail
  a7: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Ponytail */}
      <rect x="18" y="4" width="28" height="14" fill="#1A0A00" />
      <rect x="42" y="10" width="8" height="28" fill="#1A0A00" />
      {/* Face */}
      <rect x="18" y="16" width="28" height="20" fill="#D4A96A" />
      {/* Bindi */}
      <rect x="30" y="18" width="4" height="4" fill="#CC0000" />
      {/* Eyes */}
      <rect x="21" y="23" width="6" height="5" fill="#111" />
      <rect x="37" y="23" width="6" height="5" fill="#111" />
      <rect x="23" y="24" width="2" height="3" fill="#fff" />
      <rect x="39" y="24" width="2" height="3" fill="#fff" />
      {/* Smile */}
      <rect x="26" y="31" width="12" height="3" fill="#B07040" />
      {/* White coat */}
      <rect x="12" y="38" width="40" height="26" fill="#FFFFFF" />
      {/* Coat lapels */}
      <rect x="24" y="38" width="8" height="18" fill="#F0F0F0" />
      <rect x="12" y="38" width="6" height="26" fill="#E8E8E8" />
      <rect x="46" y="38" width="6" height="26" fill="#E8E8E8" />
      {/* Stethoscope */}
      <rect x="26" y="42" width="12" height="3" fill="#333" />
      <rect x="24" y="44" width="4" height="10" fill="#333" />
      <rect x="36" y="44" width="4" height="10" fill="#333" />
      <rect x="22" y="53" width="8" height="4" fill="#AAA" />
      {/* Name badge */}
      <rect x="14" y="48" width="10" height="7" fill="#E3F2FD" />
      <rect x="14" y="50" width="10" height="1" fill="#90CAF9" />
      <rect x="14" y="52" width="10" height="1" fill="#90CAF9" />
      {/* Arms */}
      <rect x="6" y="38" width="6" height="20" fill="#FFFFFF" />
      <rect x="52" y="38" width="6" height="20" fill="#FFFFFF" />
    </svg>
  ),

  // a8: Scientist — lab coat, glasses, messy hair
  a8: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Messy hair */}
      <rect x="14" y="4" width="36" height="10" fill="#888" />
      <rect x="10" y="8" width="6" height="8" fill="#888" />
      <rect x="48" y="8" width="6" height="8" fill="#888" />
      <rect x="14" y="6" width="6" height="6" fill="#666" />
      <rect x="24" y="4" width="6" height="4" fill="#AAA" />
      <rect x="38" y="5" width="6" height="6" fill="#777" />
      <rect x="44" y="4" width="8" height="8" fill="#888" />
      {/* Face */}
      <rect x="18" y="14" width="28" height="22" fill="#FDBCB4" />
      {/* Glasses */}
      <rect x="19" y="20" width="11" height="9" fill="none" stroke="#222" strokeWidth="2" />
      <rect x="34" y="20" width="11" height="9" fill="none" stroke="#222" strokeWidth="2" />
      <rect x="30" y="23" width="4" height="3" fill="#222" />
      {/* Eyes */}
      <rect x="22" y="22" width="4" height="4" fill="#111" />
      <rect x="37" y="22" width="4" height="4" fill="#111" />
      <rect x="23" y="23" width="2" height="2" fill="#fff" />
      <rect x="38" y="23" width="2" height="2" fill="#fff" />
      {/* Expression — thoughtful */}
      <rect x="24" y="30" width="16" height="3" fill="#E89070" />
      {/* Lab coat */}
      <rect x="12" y="38" width="40" height="26" fill="#F5F5F5" />
      <rect x="12" y="38" width="8" height="26" fill="#EBEBEB" />
      <rect x="44" y="38" width="8" height="26" fill="#EBEBEB" />
      {/* Flask / equipment in pocket */}
      <rect x="14" y="48" width="8" height="10" fill="#E3F2FD" />
      <rect x="16" y="46" width="4" height="4" fill="#90CAF9" />
      <rect x="17" y="50" width="2" height="6" fill="#42A5F5" />
      {/* Coat buttons */}
      <rect x="30" y="40" width="4" height="22" fill="#E8E8E8" />
      <rect x="30" y="44" width="4" height="2" fill="#999" />
      <rect x="30" y="50" width="4" height="2" fill="#999" />
      <rect x="30" y="56" width="4" height="2" fill="#999" />
      {/* Arms */}
      <rect x="6" y="38" width="6" height="22" fill="#F5F5F5" />
      <rect x="52" y="38" width="6" height="22" fill="#F5F5F5" />
    </svg>
  ),

  // a9: Dancer — classical dance pose, bindi, elaborate costume
  a9: (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      {/* Elaborate headdress */}
      <rect x="20" y="2" width="24" height="6" fill="#FFD700" />
      <rect x="22" y="1" width="20" height="4" fill="#FF8C00" />
      <rect x="26" y="0" width="12" height="4" fill="#FFD700" />
      {/* Side ornaments */}
      <rect x="12" y="6" width="8" height="10" fill="#FFD700" />
      <rect x="44" y="6" width="8" height="10" fill="#FFD700" />
      {/* Hair */}
      <rect x="18" y="6" width="28" height="12" fill="#1A0800" />
      {/* Face */}
      <rect x="18" y="16" width="28" height="20" fill="#C8845A" />
      {/* Bindi */}
      <rect x="30" y="18" width="4" height="4" fill="#CC0000" />
      {/* Kohl eyes */}
      <rect x="20" y="22" width="8" height="6" fill="#111" />
      <rect x="36" y="22" width="8" height="6" fill="#111" />
      <rect x="22" y="23" width="3" height="4" fill="#fff" />
      <rect x="38" y="23" width="3" height="4" fill="#fff" />
      {/* Nose ring */}
      <rect x="30" y="30" width="4" height="3" fill="#FFD700" />
      {/* Lips */}
      <rect x="25" y="32" width="14" height="4" fill="#CC3333" />
      {/* Elaborate costume top */}
      <rect x="16" y="38" width="32" height="12" fill="#8B0000" />
      <rect x="16" y="38" width="32" height="2" fill="#FFD700" />
      <rect x="16" y="48" width="32" height="2" fill="#FFD700" />
      {/* Dance skirt */}
      <rect x="10" y="50" width="44" height="14" fill="#CC0033" />
      <rect x="10" y="50" width="44" height="2" fill="#FFD700" />
      <rect x="10" y="60" width="44" height="4" fill="#8B0000" />
      {/* Left arm raised (dance pose) */}
      <rect x="4" y="30" width="14" height="6" fill="#C8845A" />
      <rect x="4" y="28" width="6" height="8" fill="#C8845A" />
      {/* Right arm extended */}
      <rect x="46" y="40" width="14" height="6" fill="#C8845A" />
      {/* Bangles */}
      <rect x="4" y="30" width="6" height="2" fill="#FFD700" />
      <rect x="4" y="34" width="6" height="2" fill="#FF69B4" />
      <rect x="54" y="42" width="6" height="2" fill="#FFD700" />
    </svg>
  ),
};

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
}

export default function Avatar({ id, size = 48, className = '' }: AvatarProps) {
  const bg = AVATAR_BACKGROUNDS[id];
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        background: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {AVATAR_SVGS[id]}
    </div>
  );
}
