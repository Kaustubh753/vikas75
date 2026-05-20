'use client';

import { useRef, KeyboardEvent, ChangeEvent, ClipboardEvent } from 'react';

interface Props {
  value: string;      // up to 4 uppercase letters, e.g. 'AB' or 'ABCD'
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function CodeInput({ value, onChange, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  // Always represent as exactly 4 slots
  const chars = [value[0] ?? '', value[1] ?? '', value[2] ?? '', value[3] ?? ''].map(c =>
    c.toUpperCase()
  );

  function emit(next: string[]) {
    onChange(next.join(''));
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (!raw) {
      // Deletion handled via onKeyDown; onChange with empty means browser cleared it
      const next = [...chars];
      next[i] = '';
      emit(next);
      return;
    }
    const char = raw[raw.length - 1]; // take last char (handles replacing existing char)
    const next = [...chars];
    next[i] = char;
    emit(next);
    if (i < 3) setTimeout(() => refs.current[i + 1]?.focus(), 0);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (chars[i]) {
        // Clear the current box — onChange will fire and handle it, but also handle directly:
        e.preventDefault();
        const next = [...chars];
        next[i] = '';
        emit(next);
      } else if (i > 0) {
        // Current box already empty — go back and clear previous
        e.preventDefault();
        const next = [...chars];
        next[i - 1] = '';
        emit(next);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      refs.current[i + 1]?.focus();
    } else if (e.key === 'Tab') {
      // Let tab navigate normally
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    const next = [text[0] ?? '', text[1] ?? '', text[2] ?? '', text[3] ?? ''];
    emit(next);
    setTimeout(() => refs.current[Math.min(text.length, 3)]?.focus(), 0);
  }

  function handleFocus(i: number) {
    refs.current[i]?.select();
  }

  return (
    <div className="flex gap-3 justify-center">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={char}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(i)}
          disabled={disabled}
          className={`
            w-14 h-16 text-center text-2xl font-bold text-[#1a3a6e]
            border-2 rounded-xl transition-all select-none caret-transparent
            focus:outline-none focus:ring-2 focus:ring-[#1a3a6e]/30
            disabled:opacity-40
            ${char
              ? 'border-[#1a3a6e] bg-[#1a3a6e]/5 shadow-sm'
              : 'border-[#1a3a6e]/25 bg-white'
            }
          `}
        />
      ))}
    </div>
  );
}
