'use client';
import { useState } from 'react';
import { ALL_AVATAR_IDS, AVATAR_NAMES, randomAvatarId } from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

// Pixel-art dice face (5 pips) — white on transparent
function DiceIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: hovered ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 300ms ease',
        flexShrink: 0,
      }}
    >
      {/* Die body */}
      <rect x="2" y="2" width="34" height="34" rx="6" stroke="white" strokeWidth="2.5" />
      {/* Top-left pip */}
      <circle cx="11" cy="11" r="2.8" fill="white" />
      {/* Top-right pip */}
      <circle cx="27" cy="11" r="2.8" fill="white" />
      {/* Centre pip */}
      <circle cx="19" cy="19" r="2.8" fill="white" />
      {/* Bottom-left pip */}
      <circle cx="11" cy="27" r="2.8" fill="white" />
      {/* Bottom-right pip */}
      <circle cx="27" cy="27" r="2.8" fill="white" />
    </svg>
  );
}

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
}

export default function AvatarPicker({ value, onChange, disabled }: Props) {
  const [hoveredId, setHoveredId] = useState<AvatarId | null>(null);

  function handleSelect(id: AvatarId) {
    if (disabled) return;
    onChange(id === 'a0' ? randomAvatarId() : id);
  }

  return (
    <div>
      {/* Section label */}
      <p
        style={{
          fontFamily: 'var(--font-inter)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 10,
        }}
      >
        Choose Your Avatar
      </p>

      {/* 4 rows × 3 cols — all 12 slots visible at once */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ALL_AVATAR_IDS.map((id) => {
          const isRandom = id === 'a0';
          const isSelected = !isRandom && value === id;
          const isHovered = hoveredId === id;

          const border = isSelected
            ? '2px solid #FF9933'
            : isHovered
            ? '1.5px solid rgba(255,153,51,0.5)'
            : '1.5px solid rgba(255,255,255,0.1)';

          const boxShadow = isSelected ? '0 0 0 3px rgba(255,153,51,0.25)' : 'none';
          const scale = isSelected || isHovered ? 'scale(1.05)' : 'scale(1)';

          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              disabled={disabled}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={`${AVATAR_NAMES[id]}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
                // Cell is always square; min 72 px, grows to fill column width
                width: '100%',
                aspectRatio: '1 / 1',
                minWidth: 72,
                minHeight: 72,
                background: isRandom
                  ? 'linear-gradient(135deg, rgba(255,153,51,0.55) 0%, #1a3a6e 70%)'
                  : '#1a3a6e',
                borderRadius: 10,
                border,
                boxShadow,
                transform: scale,
                transition: 'border-color 150ms, transform 150ms, box-shadow 150ms',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: 0,
                outline: 'none',
              }}
            >
              {isRandom ? (
                <DiceIcon hovered={isHovered} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/avatars/${id}.webp`}
                  alt={AVATAR_NAMES[id]}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              )}

              {/* Selected checkmark badge — 16 px saffron circle, bottom-right */}
              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#FF9933',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 2,
                  }}
                >
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path
                      d="M1 3.5L3.3 6L8 1"
                      stroke="white"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
