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
      <p className="text-[#1a3a6e] font-bold text-xs uppercase tracking-widest mb-3">
        Pick Your Avatar
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {ALL_AVATAR_IDS.map((id) => {
          const isSelected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => !disabled && onChange(id)}
              disabled={disabled}
              aria-label={`Choose avatar: ${AVATAR_NAMES[id]}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              className={`relative rounded-xl overflow-hidden transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#1a3a6e] ${
                isSelected
                  ? 'ring-3 ring-[#1a3a6e] shadow-lg scale-105'
                  : 'ring-1 ring-black/10 hover:scale-102 opacity-80 hover:opacity-100'
              }`}
              style={{ background: AVATAR_BACKGROUNDS[id] }}
            >
              <Avatar id={id} size={72} />
              {isSelected && (
                <div className="absolute bottom-0 inset-x-0 h-1 bg-[#FF9933]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
