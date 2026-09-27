'use client';
import { useRef, useState } from 'react';
import { ALL_AVATAR_IDS, AVATAR_NAMES, REAL_AVATAR_IDS } from '@/lib/avatars';
import type { AvatarId } from '@/types/game';

const COLS = 3;

// Pixel-art dice face (5 pips) — white on transparent
function DiceIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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
  /** Avatars already in use in the room, keyed to the name of the player holding them. */
  taken?: Partial<Record<AvatarId, string>>;
  /** id of the visible label for the group. */
  labelledBy?: string;
  /** Called when a taken tile is tapped, with the owner's name, so the page can say so. */
  onBlocked?: (owner: string) => void;
}

/**
 * 3×4 grid of avatar tiles. One roving tab stop (the selected tile, or the dice when nothing is
 * chosen); arrow keys move focus around the grid, Space or Enter picks; taken tiles stay
 * focusable so a screen reader can hear who holds them.
 */
export default function AvatarPicker({ value, onChange, disabled, taken = {}, labelledBy, onBlocked }: Props) {
  const [hoveredId, setHoveredId] = useState<AvatarId | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIdx = ALL_AVATAR_IDS.indexOf(value);
  const tabStop = focusIdx ?? (selectedIdx > 0 ? selectedIdx : 0);

  function pickRandom() {
    const pool = REAL_AVATAR_IDS.filter((id) => !taken[id]);
    const from = pool.length ? pool : REAL_AVATAR_IDS;
    onChange(from[Math.floor(Math.random() * from.length)]);
  }

  function handleSelect(id: AvatarId) {
    if (disabled) return;
    if (id === 'a0') { pickRandom(); return; }
    if (taken[id]) { onBlocked?.(taken[id] as string); return; }
    onChange(id);
  }

  function moveFocus(from: number, e: React.KeyboardEvent) {
    const n = ALL_AVATAR_IDS.length;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight': next = (from + 1) % n; break;
      case 'ArrowLeft': next = (from - 1 + n) % n; break;
      case 'ArrowDown': next = (from + COLS) % n; break;
      case 'ArrowUp': next = (from - COLS + n) % n; break;
      case 'Home': next = 0; break;
      case 'End': next = n - 1; break;
      default: return;
    }
    e.preventDefault();
    setFocusIdx(next);
    refs.current[next]?.focus();
  }

  const tile = (id: AvatarId, i: number) => {
    const isRandom = id === 'a0';
    const isTaken = !isRandom && !!taken[id];
    const isSelected = !isRandom && value === id;
    const isHovered = hoveredId === id;

    const border = isSelected
      ? '2px solid #FF9933'
      : isRandom
      ? '1.5px solid rgba(255,153,51,0.5)'
      : isHovered && !isTaken
      ? '1.5px solid rgba(255,153,51,0.5)'
      : '1.5px solid rgba(255,255,255,0.1)';

    const boxShadow = isSelected
      ? '0 0 0 3px rgba(255,153,51,0.25), 0 8px 32px rgba(0,0,0,0.4)'
      : '0 4px 20px rgba(0,0,0,0.35)';
    const scale = (isSelected || (isHovered && !isTaken)) ? 'scale(1.05)' : 'scale(1)';

    return (
      <button
        key={id}
        ref={(el) => { refs.current[i] = el; }}
        type="button"
        role={isRandom ? 'button' : 'radio'}
        aria-checked={isRandom ? undefined : isSelected}
        aria-disabled={isTaken || undefined}
        tabIndex={i === tabStop ? 0 : -1}
        onClick={() => handleSelect(id)}
        onKeyDown={(e) => moveFocus(i, e)}
        onFocus={() => { setFocusIdx(i); setHoveredId(id); }}
        onBlur={() => setHoveredId(null)}
        disabled={disabled}
        onMouseEnter={() => setHoveredId(id)}
        onMouseLeave={() => setHoveredId(null)}
        aria-label={
          isRandom ? 'Pick a random avatar'
          : isTaken ? `${AVATAR_NAMES[id]}, taken by ${taken[id]}`
          : AVATAR_NAMES[id]
        }
        title={isRandom ? 'Random' : isTaken ? `Taken by ${taken[id]}` : AVATAR_NAMES[id]}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          minWidth: 72,
          minHeight: 72,
          background: '#1a3a6e',
          borderRadius: 10,
          border,
          boxShadow,
          transform: scale,
          transition: 'border-color 150ms, transform 150ms, box-shadow 150ms, opacity 150ms',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled || isTaken ? 'not-allowed' : 'pointer',
          padding: 0,
          opacity: isTaken ? 0.38 : 1,
        }}
      >
        {isRandom ? (
          <DiceIcon hovered={isHovered} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/avatars/${id}.webp`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: isTaken ? 'grayscale(1)' : 'none' }}
          />
        )}

        {/* Owner caption on a taken tile — the room already has this face */}
        {isTaken && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '4px 4px', background: 'rgba(8,7,15,0.85)',
              fontFamily: 'var(--font-inter),var(--font-devanagari),sans-serif', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(250,248,240,0.75)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
            }}
          >
            {taken[id]}
          </span>
        )}

        {/* Selected checkmark badge — 18 px saffron circle, bottom-right */}
        {isSelected && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#FF9933',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            <svg width="10" height="8" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.3 6L8 1" stroke="#1a1208" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 8 }}
    >
      {ALL_AVATAR_IDS.map(tile)}
    </div>
  );
}
