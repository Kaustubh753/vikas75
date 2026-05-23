'use client';
import { useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function CodeInput({ value, onChange, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const chars = [value[0] ?? '', value[1] ?? '', value[2] ?? '', value[3] ?? ''].map((c) =>
    c.toUpperCase()
  );

  function emit(next: string[]) {
    onChange(next.join(''));
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    // Exclude I and O — room codes never contain them (too similar to 1 and 0)
    const raw = e.target.value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '');
    if (!raw) {
      const n = [...chars];
      n[i] = '';
      emit(n);
      return;
    }
    const n = [...chars];
    n[i] = raw[raw.length - 1];
    emit(n);
    if (i < 3) setTimeout(() => refs.current[i + 1]?.focus(), 0);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const n = [...chars];
      if (chars[i]) {
        n[i] = '';
        emit(n);
      } else if (i > 0) {
        n[i - 1] = '';
        emit(n);
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 3) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const t = e.clipboardData
      .getData('text')
      .toUpperCase()
      .replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '')
      .slice(0, 4);
    emit([t[0] ?? '', t[1] ?? '', t[2] ?? '', t[3] ?? '']);
    setTimeout(() => refs.current[Math.min(t.length, 3)]?.focus(), 0);
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="Room code">
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={char}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => refs.current[i]?.select()}
          disabled={disabled}
          aria-label={`Room code letter ${i + 1} of 4`}
          className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all caret-transparent select-none
            focus:outline-none focus:ring-2 focus:ring-[#FF9933]/60 disabled:opacity-40
            font-[family-name:var(--font-bebas)] tracking-widest
            ${char ? 'border-[#FF9933] bg-[#FF9933]/10 text-[#FF9933]' : 'border-white/20 bg-white/5 text-white'}`}
        />
      ))}
    </div>
  );
}
