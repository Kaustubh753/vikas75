'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { SchemeCard, ChallengeCard } from '@/types/game';

interface Props {
  hand: SchemeCard[];
  challenge: ChallengeCard;
  onSubmit: (card: SchemeCard, explanation: string) => Promise<void>;
  submitted?: boolean;
  submittedCard?: SchemeCard;
  submittedExplanation?: string;
  timerEndsAt?: number;
  timerDuration: number;
}

function TimerRing({ total, endsAt }: { total: number; endsAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(tick);
  }, [endsAt]);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;
  return (
    <div className={`relative w-16 h-16 flex-shrink-0 ${urgent ? 'animate-pulse' : ''}`}>
      <svg viewBox="0 0 68 68" className="w-full h-full -rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="5" />
        <circle
          cx="34" cy="34" r={r} fill="none"
          stroke={urgent ? '#ef4444' : '#FF9933'}
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-[family-name:var(--font-bebas)] text-xl leading-none ${urgent ? 'text-red-400' : 'text-white'}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

const DRAFT_KEY = 'vikas75_draft_explanation';

const MAX_WORDS = 25;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PlayerSubmit({
  hand,
  challenge,
  onSubmit,
  submitted,
  submittedCard,
  submittedExplanation,
  timerEndsAt,
  timerDuration,
}: Props) {
  const [step, setStep] = useState<'select' | 'justify'>(submitted ? 'justify' : 'select');
  const [selected, setSelected] = useState<SchemeCard | null>(submittedCard ?? null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [explanation, setExplanation] = useState(submittedExplanation ?? '');
  const [loading, setLoading] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const didRestoreDraft = useRef(false);

  // Restore in-progress explanation from sessionStorage on mount (survives accidental navigation)
  useEffect(() => {
    if (didRestoreDraft.current || submitted || submittedExplanation) return;
    didRestoreDraft.current = true;
    const draft = sessionStorage.getItem(DRAFT_KEY);
    if (draft) setExplanation(draft);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist explanation as the player types
  useEffect(() => {
    if (!submitted) sessionStorage.setItem(DRAFT_KEY, explanation);
  }, [explanation, submitted]);

  // Clear draft once submission is confirmed
  useEffect(() => {
    if (submitted) sessionStorage.removeItem(DRAFT_KEY);
  }, [submitted]);

  const wordCount = countWords(explanation);
  const wordsLeft = MAX_WORDS - wordCount;

  async function handleThrow() {
    if (!selected || !explanation.trim() || loading) return;
    setThrowing(true);
    setTimeout(async () => {
      setLoading(true);
      await onSubmit(selected, explanation.trim());
      setLoading(false);
      setThrowing(false);
    }, 500);
  }

  if (submitted && submittedCard) {
    return (
      <div style={{ perspective: 800 }}>
      <motion.div className="flex flex-col items-center gap-6 py-8 px-4" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
        <p className="text-green-400 font-[family-name:var(--font-bebas)] text-2xl tracking-widest">
          SUBMITTED!
        </p>
        <div className="w-full max-w-sm bg-[#1a3a6e] border border-[#FF9933]/40 rounded-2xl p-5">
          <p className="text-[#FF9933] text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
            Your Card
          </p>
          <p className="text-white font-[family-name:var(--font-bebas)] text-xl tracking-wide mb-1">
            {submittedCard.name}
          </p>
          <p className="text-white/50 text-xs font-[family-name:var(--font-devanagari)] mb-3">
            {submittedCard.hi}
          </p>
          <p className="text-white/70 text-sm italic font-[family-name:var(--font-inter)]">
            &ldquo;{submittedExplanation}&rdquo;
          </p>
        </div>
        <p className="text-white/40 text-sm text-center font-[family-name:var(--font-inter)]">
          Watch the projector!
        </p>
      </motion.div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="flex flex-col gap-6 py-6">
        {/* Challenge card — prominent with extra vertical space */}
        <div className="px-4 flex items-start justify-between gap-3">
          <div
            className="flex-1 rounded-xl border p-6"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.12)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <p className="text-[#FF9933] uppercase mb-3 font-[family-name:var(--font-inter)]" style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
              Challenge
            </p>
            <p className="text-white font-[family-name:var(--font-bebas)] tracking-wide leading-tight" style={{ fontSize: 22 }}>
              {challenge.en}
            </p>
            <p className="text-blue-200/80 font-[family-name:var(--font-devanagari)] mt-3 leading-relaxed" style={{ fontSize: 16 }}>
              {challenge.hi}
            </p>
          </div>
          {timerEndsAt && <TimerRing total={timerDuration} endsAt={timerEndsAt} />}
        </div>

        <p className="text-white/60 px-4 font-[family-name:var(--font-inter)] uppercase" style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
          Your Hand — tap to select
        </p>

        {/* Horizontal scrolling card tray — compact, expand only when selected */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
            {hand.map((card, index) => {
              const isExpanded = expanded === card.id;
              const isSelected = selected?.id === card.id;
              return (
                <motion.div
                  key={card.id}
                  onClick={() => {
                    setSelected(card);
                    setExpanded(expanded === card.id ? null : card.id);
                  }}
                  className={`relative rounded-xl cursor-pointer transition-all flex-shrink-0 overflow-hidden
                    ${isSelected
                      ? 'border-2 border-[#FF9933]'
                      : 'border border-white/12'}
                    ${isExpanded ? 'bg-[#1a4a9e]' : 'bg-[#1a3a6e]'}`}
                  style={{
                    width: isExpanded ? 200 : 144,
                    minHeight: isExpanded ? 200 : 112,
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(255,153,51,0.4), 0 4px 24px rgba(0,0,0,0.3)'
                      : '0 4px 24px rgba(0,0,0,0.3)',
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="p-4">
                    <p className="text-[#FF9933] uppercase mb-2 font-[family-name:var(--font-inter)]" style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
                      Scheme
                    </p>
                    <p className="font-[family-name:var(--font-inter)] text-white leading-tight mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
                      {card.name}
                    </p>
                    <p className="text-white/50 font-[family-name:var(--font-devanagari)]" style={{ fontSize: 12 }}>
                      {card.hi}
                    </p>
                    {isExpanded && (
                      <p className="text-white/70 font-[family-name:var(--font-inter)] leading-relaxed mt-3" style={{ fontSize: 14 }}>
                        {card.desc}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF9933] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="px-4">
          <button
            onClick={() => selected && setStep('justify')}
            disabled={!selected}
            className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
          >
            {selected ? `Play ${selected.name} →` : 'Select a Card First'}
          </button>
        </div>
      </div>
    );
  }

  // Step: justify
  return (
    <div className={`flex flex-col gap-5 py-6 px-4 ${throwing ? 'animate-card-throw' : ''}`}>
      {selected && (
        <div className="bg-[#1a3a6e] border border-white/10 rounded-2xl p-4">
          <p className="text-[#FF9933] text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
            Your Card
          </p>
          <p className="font-[family-name:var(--font-bebas)] text-white text-xl tracking-wide">
            {selected.name}
          </p>
          <p className="text-white/50 text-xs font-[family-name:var(--font-devanagari)]">{selected.hi}</p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-white/60 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
            Your Justification
          </label>
          <span
            className={`text-xs font-bold font-[family-name:var(--font-inter)] ${
              wordsLeft <= 5 ? 'text-red-400' : wordsLeft <= 10 ? 'text-orange-400' : 'text-white/40'
            }`}
          >
            {wordCount}/{MAX_WORDS} words
          </span>
        </div>
        <textarea
          value={explanation}
          onChange={(e) => {
            const words = e.target.value.trim().split(/\s+/).filter(Boolean);
            if (words.length <= MAX_WORDS || e.target.value.length < explanation.length) {
              setExplanation(e.target.value);
            }
          }}
          placeholder="Why does your scheme solve this challenge? (25 words max)"
          rows={4}
          className="w-full rounded-xl border-2 border-white/20 bg-white/5 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#FF9933] focus:ring-2 focus:ring-[#FF9933]/40 placeholder-white/30 resize-none transition-all font-[family-name:var(--font-inter)]"
        />
        <p className="text-white/30 text-xs mt-1 font-[family-name:var(--font-inter)]">
          Tip: One crisp sentence earns a bonus point!
        </p>
      </div>

      <motion.button
        onClick={handleThrow}
        disabled={!explanation.trim() || loading || throwing}
        className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-inter)] uppercase tracking-widest rounded-xl transition-all active:scale-95"
        style={{ height: 48, backgroundColor: '#FF9933', fontSize: 16, fontWeight: 600 }}
        whileTap={{ scale: 0.95 }}
      >
        {loading || throwing ? 'Throwing…' : 'Throw Your Card ↑'}
      </motion.button>

      <button
        onClick={() => setStep('select')}
        disabled={loading || throwing}
        className="text-white/40 text-sm text-center hover:text-white/60 transition-colors"
      >
        ← Change card
      </button>
    </div>
  );
}
