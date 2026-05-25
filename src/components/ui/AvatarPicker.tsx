'use client';
import { useState } from 'react';
import { ALL_AVATAR_IDS, AVATAR_NAMES } from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

const GAP = 8; // px — gap between cells

interface Props {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
}

export default function AvatarPicker({ value, onChange, disabled }: Props) {
  const [hoveredId, setHoveredId] = useState<AvatarId | null>(null);

  return (
    <div style={{ width: '100%' }}>
      <p style={{
        fontFamily: 'var(--font-inter)',
        fontSize: 11, fontWeight: 500,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)',
        marginBottom: 7,
      }}>
        Choose Your Avatar
      </p>

      {/* 3 × 3 fluid grid — fills parent width, cells stay square via aspect-ratio */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: GAP,
        width: '100%',
      }}>
        {ALL_AVATAR_IDS.map((id) => {
          const isSelected = value === id;
          const isHovered  = hoveredId === id;

          const border = isSelected
            ? '2.5px solid #FF9933'
            : isHovered
            ? '1.5px solid rgba(255,153,51,0.5)'
            : '1.5px solid rgba(255,255,255,0.1)';

          const boxShadow = isSelected
            ? 'inset 0 0 0 1px rgba(255,153,51,0.25), inset 0 0 12px rgba(255,153,51,0.12)'
            : 'none';

          return (
            <button
              key={id}
              type="button"
              onClick={() => !disabled && onChange(id)}
              disabled={disabled}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={`${AVATAR_NAMES[id]}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                flexShrink: 0,
                background: isSelected ? '#1f4070' : isHovered ? '#1d3d6a' : '#1a3a6e',
                borderRadius: 8,
                border, boxShadow,
                transition: 'border-color 150ms, box-shadow 150ms, background 150ms',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                padding: 0, outline: 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
