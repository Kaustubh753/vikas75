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

      {/*
        NO transform:scale — scale() gets clipped by any ancestor with
        overflow:auto/hidden (including the scroll container on the left panel).
        Instead we use border + inset box-shadow which are painted inside the
        element's own bounds and are therefore never clipped.
      */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {ALL_AVATAR_IDS.map((id) => {
          const isRandom = id === 'a0';
          const isSelected = !isRandom && value === id;
          const isHovered = hoveredId === id;

          // Border lives inside the element — cannot be clipped by ancestors.
          const border = isSelected
            ? '2.5px solid #FF9933'
            : isHovered
            ? '1.5px solid rgba(255,153,51,0.5)'
            : '1.5px solid rgba(255,255,255,0.1)';

          // Inset shadows also stay inside the element's paint box.
          const boxShadow = isSelected
            ? 'inset 0 0 0 1px rgba(255,153,51,0.25), inset 0 0 14px rgba(255,153,51,0.12)'
            : isHovered
            ? 'inset 0 0 0 1px rgba(255,153,51,0.1)'
            : 'none';

          // Background brightens slightly on hover/selected for extra feedback.
          const background = isRandom
            ? 'linear-gradient(135deg, rgba(255,153,51,0.55) 0%, #1a3a6e 70%)'
            : isSelected
            ? '#1f4070'
            : isHovered
            ? '#1d3d6a'
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
                width: '100%',
                aspectRatio: '1 / 1',
                minWidth: 72,
                minHeight: 72,
                background,
                borderRadius: 10,
                border,
                boxShadow,
                // No transform:scale — see comment above
                transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
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
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    // Subtle brightness boost on hover/selected — painted inside img bounds
                    filter: isSelected
                      ? 'brightness(1.08)'
                      : isHovered
                      ? 'brightness(1.05)'
                      : 'none',
                    transition: 'filter 150ms',
                  }}
                />
              )}

              {/* Checkmark badge — absolutely positioned inside the cell */}
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
