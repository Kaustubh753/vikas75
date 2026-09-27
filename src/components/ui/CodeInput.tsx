'use client';
import { useRef, useState } from 'react';

// Room codes never contain I or O (too close to 1 and 0); the server generates from the same
// alphabet, so anything else is stripped on the way in.
const STRIP = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
const VALID4 = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const VALID_PARTIAL = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{1,4}$/;

/**
 * Pull a room code out of whatever was pasted: a bare code, a share link with `?code=XXXX`,
 * a WhatsApp message like "Join my game, code PQMS", or a partial "Room code is NEC". Falls
 * back to the first four valid characters so a plain paste still works.
 */
export function extractRoomCode(text: string): string {
  const upper = text.toUpperCase();
  // 1. A share link: ...?code=XSZQ
  const param = upper.match(/CODE=([A-Z0-9]{4})/);
  if (param && VALID4.test(param[1])) return param[1];
  // 2. "code: XSZQ", "Code XSZQ", "code - XSZQ"
  const after = upper.match(/CODE\b[^A-Z0-9]{0,6}([A-Z0-9]{4})(?![A-Z0-9])/);
  if (after && VALID4.test(after[1])) return after[1];
  // 3. A token that was already written in capitals (people copy the code as they see it),
  //    then any valid four-letter token, preferring the last one (codes tend to end a message).
  const tokens = text.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const caps = tokens.find((t) => t.length === 4 && t === t.toUpperCase() && VALID4.test(t));
  if (caps) return caps;
  const valid = tokens.map((t) => t.toUpperCase()).filter((t) => VALID4.test(t));
  if (valid.length) return valid[valid.length - 1];
  // 4. A partial code: the last short token made only of code letters ("Room code is NEC").
  const partial = tokens.map((t) => t.toUpperCase()).reverse().find((t) => VALID_PARTIAL.test(t));
  if (partial) return partial;
  // 5. A bare paste: keep the first four valid characters.
  return upper.replace(STRIP, '').slice(0, 4);
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Paint the slots Buzzer Red (the code does not match a room). */
  error?: boolean;
  /** id of the visible label for the group. */
  labelledBy?: string;
}

export default function CodeInput({ value, onChange, disabled, error, labelledBy }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const [focused, setFocused] = useState<number | null>(null);
  const chars = [value[0] ?? '', value[1] ?? '', value[2] ?? '', value[3] ?? ''].map((c) => c.toUpperCase());

  // Always emit a fixed four-slot string so clearing a middle letter never shifts the rest.
  function emit(next: string[]) {
    onChange(next.map((c) => c || ' ').join('').replace(/\s+$/, ''));
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.toUpperCase().replace(STRIP, '');
    const n = [...chars];
    if (!raw) {
      n[i] = '';
      emit(n);
      return;
    }
    // Typing into a filled slot overwrites it (the slot selects its content on focus). A burst
    // of several characters (a hardware keyboard, an IME commit) spills into the next slots.
    const letters = raw.split('');
    let cursor = i;
    for (const ch of letters) {
      if (cursor > 3) break;
      n[cursor] = ch;
      cursor += 1;
    }
    emit(n);
    const next = Math.min(cursor, 3);
    if (next !== i || cursor > 3) setTimeout(() => refs.current[next]?.focus(), 0);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const n = [...chars];
      if (chars[i].trim()) {
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
    const t = extractRoomCode(e.clipboardData.getData('text'));
    if (!t) return;
    emit([t[0] ?? '', t[1] ?? '', t[2] ?? '', t[3] ?? '']);
    setTimeout(() => refs.current[Math.min(t.length, 3)]?.focus(), 0);
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Room code'}
      style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
    >
      {chars.map((char, i) => {
        const filled = char.trim().length > 0;
        const active = focused === i;
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            value={char.trim()}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => { setFocused(i); e.target.select(); }}
            onBlur={() => setFocused((f) => (f === i ? null : f))}
            disabled={disabled}
            aria-label={`Room code letter ${i + 1} of 4`}
            aria-invalid={error || undefined}
            className="code-slot"
            style={{
              width: 'clamp(52px, 15vw, 64px)', height: 'clamp(58px, 16vw, 70px)',
              background: active ? 'rgba(255,153,51,0.08)' : 'rgba(250,248,240,.04)',
              border: `1.5px solid ${error ? '#ef4444' : filled || active ? '#FF9933' : 'rgba(250,248,240,.14)'}`,
              boxShadow: active ? 'inset 0 -3px 0 #FF9933' : 'none',
              borderRadius: 6, color: error ? '#ef4444' : '#ffffff', caretColor: '#FF9933',
              fontFamily: 'var(--font-inter),sans-serif', fontWeight: 600, fontSize: 'clamp(24px, 6vw, 28px)',
              textAlign: 'center', textTransform: 'uppercase',
              transition: 'border-color .12s ease, color .12s ease, background .12s ease',
              opacity: disabled ? 0.5 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
