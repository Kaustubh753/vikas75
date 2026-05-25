'use client';
import { useState } from 'react';
import { ALL_AVATAR_IDS, AVATAR_NAMES, randomAvatarId } from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

// Fixed cell size — predictable layout regardless of parent container width.
const CELL = 56;
const GAP  = 6;

function DiceIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg
      width="30" height="30" viewBox="0 0 38 38" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: hovered ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 300ms ease',
        flexShrink: 0,
      }}
    >
      <rect x="2" y="2" width="34" height="34" rx="6" stroke="white" strokeWidth="2.5" />
      <circle cx="11" cy="11" r="2.8" fill="white" />
      <circle cx="27" cy="11" r="2.8" fill="white" />
      <circle cx="19" cy="19" r="2.8" fill="white" />
      <circle cx="11" cy="27" r="2.8" fill="white" />
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
      <p style={{
        fontFamily: 'var(--font-inter)',
        fontSize: 11, fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 8,
      }}>
        Choose Your Avatar
      </p>

      {/* Fixed-size grid — cells are CELL×CELL px, total width is always
          3*CELL + 2*GAP = predictable regardless of parent container. */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${CELL}px)`,
        gap: GAP,
      }}>
        {ALL_AVATAR_IDS.map((id) => {
          const isRandom   = id === 'a0';
          const isSelected = !isRandom && value === id;
          const isHovered  = hoveredId === id;

          const border = isSelected
            ? '2.5px solid #FF9933'
            : isHovered
            ? '1.5px solid rgba(255,153,51,0.5)'
            : '1.5px solid rgba(255,255,255,0.1)';

          const boxShadow = isSelected
            ? 'inset 0 0 0 1px rgba(255,153,51,0.25), inset 0 0 14px rgba(255,153,51,0.12)'
            : isHovered
            ? 'inset 0 0 0 1px rgba(255,153,51,0.1)'
            : 'none';

          const background = isRandom
            ? 'linear-gradient(135deg, rgba(255,153,51,0.55) 0%, #1a3a6e 70%)'
            : isSelected ? '#1f4070'
            : isHovered  ? '#1d3d6a'
            : '#1a3a6e';

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
                width: CELL, height: CELL,   // fixed — never grows
                flexShrink: 0,
                background, borderRadius: 8,
                border, boxShadow,
                transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: 0, outline: 'none',
              }}
            >
              {isRandom ? (
                <DiceIcon hovered={isHovered} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/avatars/${id}.webp`}
                  alt={AVATAR_NAMES[id]}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'contain', display: 'block',
                    filter: isSelected ? 'brightness(1.08)' : isHovered ? 'brightness(1.05)' : 'none',
                    transition: 'filter 150ms',
                  }}
                />
              )}

              {isSelected && (
                <span style={{
                  position: 'absolute', bottom: 3, right: 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#FF9933',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, zIndex: 2,
                }}>
                  <svg width="8" height="6" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.3 6L8 1" stroke="white" strokeWidth="1.6"
                          strokeLinecap="round" strokeLinejoin="round" />
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
