'use client';
import Avatar, {
  ALL_AVATAR_IDS,
  AVATAR_NAMES,
  randomAvatarId,
} from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
}

export default function AvatarPicker({ value, onChange, disabled }: Props) {
  function handleSelect(id: AvatarId) {
    if (disabled) return;
    // Slot a0 = random: pick a real id immediately
    onChange(id === 'a0' ? randomAvatarId() : id);
  }

  return (
    <div>
      <p className="text-white/60 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
        Choose Avatar
      </p>
      {/* 4 rows × 3 cols = 12 slots; a0 (random) fills the first */}
      <div className="grid grid-cols-3 gap-2">
        {ALL_AVATAR_IDS.map((id) => {
          const isRandom = id === 'a0';
          const selected = !isRandom && value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              disabled={disabled}
              aria-label={`${AVATAR_NAMES[id]}${selected ? ' (selected)' : ''}`}
              aria-pressed={selected}
              className={`relative rounded-xl overflow-hidden transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933]
                ${
                  selected
                    ? 'ring-2 ring-[#FF9933] scale-105 shadow-lg shadow-[#FF9933]/30'
                    : isRandom
                    ? 'ring-1 ring-dashed ring-white/30 opacity-80 hover:opacity-100'
                    : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
                }`}
              style={{ background: 'transparent' }}
            >
              <Avatar id={id} size={72} />
              {/* "Random" label overlay */}
              {isRandom && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-center font-[family-name:var(--font-inter)] font-semibold leading-none"
                     style={{ fontSize: 9, padding: '3px 0 4px' }}>
                  RANDOM
                </div>
              )}
              {/* Selected indicator */}
              {selected && <div className="absolute bottom-0 inset-x-0 h-1 bg-[#FF9933]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
