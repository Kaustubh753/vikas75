import Image from 'next/image';
import type { AvatarId } from '@/types/game';

// 9 avatars — a0 (random), a6 (deep thinker), a9 (tribal) removed.
export const ALL_AVATAR_IDS: AvatarId[] = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a7', 'a8', 'a10', 'a11',
];

/** @deprecated kept for legacy callers — identical to ALL_AVATAR_IDS */
export const REAL_AVATAR_IDS = ALL_AVATAR_IDS;

export const AVATAR_BACKGROUNDS: Record<AvatarId, string> = {
  a1: 'transparent', a2: 'transparent', a3: 'transparent',
  a4: 'transparent', a5: 'transparent', a7: 'transparent',
  a8: 'transparent', a10: 'transparent', a11: 'transparent',
};

export const AVATAR_NAMES: Record<AvatarId, string> = {
  a1:  'Heart Eyes',
  a2:  'Cow Hugger',
  a3:  'Safari Mode',
  a4:  'Lotus Holder',
  a5:  'Specs Check',
  a7:  'Melody Man',
  a8:  'Top Gun',
  a10: 'Side Eye',
  a11: 'Laser Eyes',
};

interface AvatarProps {
  id: AvatarId;
  size?: number;
  className?: string;
}

export default function Avatar({ id, size = 48, className = '' }: AvatarProps) {
  return (
    <div
      className={className}
      style={{
        width: size, height: size,
        background: 'transparent',
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
        alt={AVATAR_NAMES[id] ?? id}
        width={size}
        height={size}
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        priority={false}
      />
    </div>
  );
}
