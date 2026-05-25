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

/** No custom background — images carry their own background colour */
export const AVATAR_BACKGROUNDS: Record<AvatarId, string> = {
  a0: 'transparent', a1: 'transparent', a2: 'transparent',
  a3: 'transparent', a4: 'transparent', a5: 'transparent',
  a6: 'transparent', a7: 'transparent', a8: 'transparent',
  a9: 'transparent', a10: 'transparent', a11: 'transparent',
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
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        priority={false}
      />
    </div>
  );
}
