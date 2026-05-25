import Image from 'next/image';
import type { AvatarId } from '@/types/game';

// Real avatar ids (a1–a11). a0 is the "random" slot in the picker —
// it resolves to a randomly chosen real id before being stored.
export const REAL_AVATAR_IDS: AvatarId[] = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6',
  'a7', 'a8', 'a9', 'a10', 'a11',
];

// All ids including the random placeholder shown in the picker
export const ALL_AVATAR_IDS: AvatarId[] = ['a0', ...REAL_AVATAR_IDS];

/** Dominant background colour sampled from each avatar image */
export const AVATAR_BACKGROUNDS: Record<AvatarId, string> = {
  a0:  '#1a3a6e', // random slot — navy fallback
  a1:  '#00BCD4', // heart eyes — cyan
  a2:  '#0097a7', // cow hugger — teal
  a3:  '#7a6a4a', // safari mode — olive
  a4:  '#757575', // lotus holder — grey
  a5:  '#6a5aaa', // specs check — purple
  a6:  '#0097a7', // deep thinker — teal
  a7:  '#6d3b1a', // melody man — brown
  a8:  '#555555', // top gun — charcoal
  a9:  '#2e7d32', // chief ji — green
  a10: '#7a5a2a', // side eye — tan
  a11: '#c84a00', // laser eyes — orange
};

export const AVATAR_NAMES: Record<AvatarId, string> = {
  a0:  '🎲 Random',
  a1:  'Heart Eyes',
  a2:  'Cow Hugger',
  a3:  'Safari Mode',
  a4:  'Lotus Holder',
  a5:  'Specs Check',
  a6:  'Deep Thinker',
  a7:  'Melody Man',
  a8:  'Top Gun',
  a9:  'Chief Ji',
  a10: 'Side Eye',
  a11: 'Laser Eyes',
};

/** Pick a random real avatar id (used when player selects the a0 slot) */
export function randomAvatarId(): AvatarId {
  return REAL_AVATAR_IDS[Math.floor(Math.random() * REAL_AVATAR_IDS.length)];
}

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
}

export default function Avatar({ id, size = 48, className = '' }: AvatarProps) {
  const bg = AVATAR_BACKGROUNDS[id];

  // a0 should never be stored — always resolve before rendering,
  // but render a fallback dice icon just in case.
  if (id === 'a0') {
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
          fontSize: size * 0.5,
        }}
      >
        🎲
      </div>
    );
  }

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
        position: 'relative',
      }}
    >
      <Image
        src={`/avatars/${id}.webp`}
        alt={AVATAR_NAMES[id]}
        width={size}
        height={size}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        priority={false}
      />
    </div>
  );
}
