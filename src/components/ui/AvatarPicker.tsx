'use client';
import Avatar, { ALL_AVATAR_IDS, AVATAR_BACKGROUNDS, AVATAR_NAMES } from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
}

export default function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <div>
      <p className="text-white/60 text-xs uppercase tracking-widest mb-3 font-[family-name:var(--font-inter)]">
        Choose Avatar
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ALL_AVATAR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => !disabled && onChange(id)}
            disabled={disabled}
            aria-label={`${AVATAR_NAMES[id]}${value === id ? ' (selected)' : ''}`}
            aria-pressed={value === id}
            className={`relative rounded-xl overflow-hidden transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9933]
              ${
                value === id
                  ? 'ring-2 ring-[#FF9933] scale-105 shadow-lg shadow-[#FF9933]/30'
                  : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
              }`}
            style={{ background: AVATAR_BACKGROUNDS[id] }}
          >
            <Avatar id={id} size={72} />
            {value === id && <div className="absolute bottom-0 inset-x-0 h-1 bg-[#FF9933]" />}
          </button>
        ))}
      </div>
    </div>
  );
}
