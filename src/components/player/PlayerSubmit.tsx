'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { SchemeCard, ChallengeCard } from '@/types/game';
import { getChallengeCardImage, getSchemeCardImage, BLUR_NAVY, BLUR_CREAM } from '@/lib/cards';
import PlayerWaiting from '@/components/player/PlayerWaiting';

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

function TimerBar({ total, endsAt }: { total: number; endsAt: number }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }, 1000); // 1s is sufficient — displayed value is already integer seconds
    return () => clearInterval(tick);
  }, [endsAt]);

  const frac = Math.max(0, remaining / total);
  const urgent = remaining <= 10;

  return (
    <div className="relative h-6 bg-white/10 overflow-hidden">
      <motion.div
        className="absolute left-0 top-0 h-full w-full"
        style={{ backgroundColor: urgent ? '#ef4444' : '#FF9933', transformOrigin: '0 50%' }}
        animate={{
          scaleX: frac,
          boxShadow: urgent ? '0 0 8px 3px rgba(239,68,68,0.7)' : 'none',
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center font-[family-name:var(--font-inter)] font-bold text-white leading-none ${urgent ? 'animate-pulse' : ''}`}
        style={{ fontSize: 12, zIndex: 1 }}
      >
        {remaining}s
      </span>
    </div>
  );
}

const DRAFT_KEY = 'vikas75_draft_explanation';
const MAX_WORDS = 25;
const CARD_W = 160;
const CARD_H = 214; // 413:554 ≈ 3:4

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
  const [explanation, setExplanation] = useState(submittedExplanation ?? '');
  // Draft is scoped to this round's challenge so an unsubmitted draft from a previous round
  // can never bleed into the next round's answer box.
  const draftKey = `${DRAFT_KEY}_${challenge.id}`;
  const [loading, setLoading] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const didRestoreDraft = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Restore draft explanation once on mount — intentionally runs only once
  // (submitted/submittedExplanation are stable on first render when restoring from sessionStorage)
  const submittedRef = useRef(submitted);
  const submittedExplanationRef = useRef(submittedExplanation);
  useEffect(() => {
    if (didRestoreDraft.current || submittedRef.current || submittedExplanationRef.current) return;
    didRestoreDraft.current = true;
    const draft = sessionStorage.getItem(draftKey);
    if (draft) setExplanation(draft);
  }, [draftKey]);

  useEffect(() => {
    if (!submitted) sessionStorage.setItem(draftKey, explanation);
  }, [explanation, submitted, draftKey]);

  useEffect(() => {
    if (submitted) sessionStorage.removeItem(draftKey);
  }, [submitted, draftKey]);

  const wordCount = countWords(explanation);
  const wordsLeft = MAX_WORDS - wordCount;

  async function handleThrow() {
    if (!selected || !explanation.trim() || loading || throwing) return;
    setThrowing(true);
    setTimeout(async () => {
      if (!mountedRef.current) return;
      setLoading(true);
      try {
        await onSubmit(selected, explanation.trim());
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setThrowing(false);
        }
      }
    }, 600);
  }

  // Guard: hand not yet loaded
  if (!submitted && hand.length === 0) {
    return <PlayerWaiting phase="submission" hint="Loading your cards…" />;
  }

  // ── Submitted confirmation ─────────────────────────────────────────────────
  if (submitted && submittedCard) {
    return (
      <motion.div
        className="flex flex-col items-center gap-5 py-8 px-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
        <p className="text-green-400 font-[family-name:var(--font-bebas)] text-2xl tracking-widest">
          SUBMITTED!
        </p>

        {/* Card image only — no duplicate name/text */}
        <div
          className="rounded-2xl overflow-hidden border-2 border-[#FF9933]/60 shadow-xl"
          style={{ width: CARD_W, height: CARD_H, position: 'relative', flexShrink: 0 }}
        >
          <Image
            src={getSchemeCardImage(submittedCard.id)}
            alt={submittedCard.name}
            fill
            sizes="160px"
            className="object-cover"
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_CREAM}
          />
        </div>

        {/* Explanation is not in the image — keep it */}
        <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-[#FF9933] text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">Your answer</p>
          <p className="text-white/80 text-sm italic font-[family-name:var(--font-inter)] leading-relaxed">
            &ldquo;{submittedExplanation}&rdquo;
          </p>
        </div>

        <p className="text-white/40 text-sm text-center font-[family-name:var(--font-inter)]">
          Watch the screen!
        </p>
      </motion.div>
    );
  }

  // ── Select step ────────────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="flex flex-col gap-5 py-6">
        {/* Timer bar — sticky */}
        {timerEndsAt && (
          <div className="sticky top-0 z-10">
            <TimerBar total={timerDuration} endsAt={timerEndsAt} />
          </div>
        )}

        {/* Challenge banner — thumbnail + text */}
        <div className="px-4">
          <div
            className="rounded-xl border overflow-hidden flex gap-3"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.12)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          >
            <div className="relative flex-shrink-0" style={{ width: 72, height: 96 }}>
              <Image
                src={getChallengeCardImage(challenge.id)}
                alt={challenge.en}
                fill
                sizes="72px"
                className="object-cover"
                priority
                placeholder="blur"
                blurDataURL={BLUR_NAVY}
              />
            </div>
            <div className="py-3 pr-3 flex flex-col justify-center">
              <p className="text-[#FF9933] uppercase mb-1 font-[family-name:var(--font-inter)]"
                 style={{ fontSize: 10, letterSpacing: '0.08em', fontWeight: 600 }}>
                Challenge
              </p>
              <p className="text-white font-[family-name:var(--font-bebas)] tracking-wide leading-tight"
                 style={{ fontSize: 15 }}>
                {challenge.en}
              </p>
              <p className="text-blue-200/70 font-[family-name:var(--font-devanagari)] mt-1 leading-relaxed"
                 style={{ fontSize: 12 }}>
                {challenge.hi}
              </p>
            </div>
          </div>
        </div>

        <p className="text-white/50 px-4 font-[family-name:var(--font-inter)] uppercase"
           style={{ fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>
          Your Hand — tap to select
        </p>

        {/* Card tray — fixed 160×214, image only */}
        <div className="overflow-x-auto overflow-y-hidden" style={{ paddingTop: 8, paddingBottom: 16 }}>
          <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
            {hand.map((card, index) => {
              const isSelected = selected?.id === card.id;
              const tilt = ((index * 137.5) % 4) - 2;
              return (
                <motion.div
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className={`relative cursor-pointer flex-shrink-0 rounded-xl overflow-hidden ${
                    isSelected ? 'border-2 border-[#FF9933]' : 'border border-white/10'
                  }`}
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(255,153,51,0.4), 0 8px 32px rgba(0,0,0,0.4)'
                      : '0 4px 20px rgba(0,0,0,0.35)',
                  }}
                  initial={{ scale: 0.85, opacity: 0, rotate: tilt }}
                  animate={{ scale: 1, opacity: 1, rotate: isSelected ? 0 : tilt }}
                  whileHover={{ rotate: 0, scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.05 }}
                >
                  <Image
                    src={getSchemeCardImage(card.id)}
                    alt={card.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={BLUR_CREAM}
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-[#FF9933] rounded-full flex items-center justify-center shadow-lg z-10"
                         style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>
                      ✓
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="px-4">
          <motion.button
            onClick={() => selected && setStep('justify')}
            disabled={!selected}
            className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-bebas)] tracking-widest rounded-xl"
            style={{
              height: 56,
              backgroundColor: '#FF9933',
              boxShadow: selected ? '0 4px 0 #cc7a00' : 'none',
              fontSize: 22,
            }}
            whileTap={selected ? { y: 4, boxShadow: '0 0 0 #cc7a00' } : {}}
          >
            {selected ? `Play ${selected.name} →` : 'Select a Card First'}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Justify step ───────────────────────────────────────────────────────────
  return (
    <motion.div
      className="flex flex-col gap-5 py-6 px-4"
      animate={throwing ? { y: -160, scale: 0.5, opacity: 0, rotate: 8 } : { y: 0, scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.6, ease: 'easeIn' }}
    >
      {timerEndsAt && (
        <div className="sticky top-0 z-10 -mx-4 mb-1">
          <TimerBar total={timerDuration} endsAt={timerEndsAt} />
        </div>
      )}

      {/* Selected card — image + name label below */}
      {selected && (
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="rounded-2xl overflow-hidden border-2 border-[#FF9933] shadow-xl"
            style={{ width: CARD_W, height: CARD_H, position: 'relative', flexShrink: 0 }}
          >
            <Image
              src={getSchemeCardImage(selected.id)}
              alt={selected.name}
              fill
              sizes="160px"
              className="object-cover"
              loading="lazy"
              placeholder="blur"
              blurDataURL={BLUR_CREAM}
            />
          </div>
          {/* Card name reminder — useful since the text in the image can be small */}
          <p
            className="font-[family-name:var(--font-bebas)] text-white/70 tracking-wide text-center leading-tight"
            style={{ fontSize: 13, maxWidth: CARD_W }}
          >
            {selected.name}
          </p>
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
        <p className="text-white/50 text-xs mt-1 font-[family-name:var(--font-inter)]">
          Tip: End with exactly one sentence (. ! or ?) to earn a bonus point!
        </p>
      </div>

      <motion.button
        onClick={handleThrow}
        disabled={!explanation.trim() || loading || throwing}
        className="w-full disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-inter)] uppercase tracking-widest rounded-xl"
        style={{
          height: 48,
          backgroundColor: '#FF9933',
          boxShadow: '0 4px 0 #cc7a00',
          fontSize: 16,
          fontWeight: 600,
        }}
        whileTap={{ y: 4, boxShadow: '0 0 0 #cc7a00' }}
      >
        {loading || throwing ? 'Throwing…' : 'Throw Your Card ↑'}
      </motion.button>

      <button
        onClick={() => setStep('select')}
        disabled={loading || throwing}
        className="w-full text-[#FF9933]/60 text-sm text-center font-[family-name:var(--font-inter)] border border-[#FF9933]/20 rounded-xl py-3 hover:text-[#FF9933] hover:border-[#FF9933]/50 hover:bg-[#FF9933]/5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ letterSpacing: '0.04em' }}
      >
        ← Change card
      </button>
    </motion.div>
  );
}
