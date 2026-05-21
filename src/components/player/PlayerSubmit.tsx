'use client';
import { useState } from 'react';
import type { SchemeCard, ChallengeCard } from '@/types/game';

interface Props {
  hand: SchemeCard[];
  challenge: ChallengeCard;
  onSubmit: (card: SchemeCard, explanation: string) => Promise<void>;
  submitted?: boolean;
  submittedCard?: SchemeCard;
  submittedExplanation?: string;
}

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
}: Props) {
  const [step, setStep] = useState<'select' | 'justify'>(submitted ? 'justify' : 'select');
  const [selected, setSelected] = useState<SchemeCard | null>(submittedCard ?? null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [explanation, setExplanation] = useState(submittedExplanation ?? '');
  const [loading, setLoading] = useState(false);
  const [throwing, setThrowing] = useState(false);

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
      <div className="flex flex-col items-center gap-6 py-8 px-4">
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
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="flex flex-col gap-4 py-6">
        <div className="px-4">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-1 font-[family-name:var(--font-inter)]">
            Challenge
          </p>
          <p className="text-white font-[family-name:var(--font-bebas)] text-xl tracking-wide">
            {challenge.icon} {challenge.en}
          </p>
        </div>
        <p className="text-white/60 text-xs uppercase tracking-widest px-4 font-[family-name:var(--font-inter)]">
          Your Hand — tap to select
        </p>

        {/* Horizontal scrolling card tray */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
            {hand.map((card) => {
              const isExpanded = expanded === card.id;
              const isSelected = selected?.id === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (expanded === card.id) {
                      setSelected(card);
                    } else {
                      setExpanded(card.id);
                    }
                  }}
                  className={`relative rounded-2xl cursor-pointer transition-all flex-shrink-0 overflow-hidden
                    ${isSelected ? 'ring-3 ring-[#FF9933] shadow-lg shadow-[#FF9933]/30' : 'ring-1 ring-white/10'}
                    ${isExpanded ? 'bg-[#1a4a9e]' : 'bg-[#1a3a6e]'}`}
                  style={{ width: isExpanded ? 200 : 160, minHeight: 200 }}
                >
                  <div className="p-4">
                    <p className="text-[#FF9933] text-xs uppercase tracking-widest mb-2 font-[family-name:var(--font-inter)]">
                      Scheme
                    </p>
                    <p className="font-[family-name:var(--font-bebas)] text-white text-lg leading-tight tracking-wide mb-1">
                      {card.name}
                    </p>
                    <p className="text-white/50 text-xs font-[family-name:var(--font-devanagari)] mb-2">
                      {card.hi}
                    </p>
                    {isExpanded && (
                      <p className="text-white/70 text-xs font-[family-name:var(--font-inter)] leading-relaxed">
                        {card.desc}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#FF9933] rounded-full flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
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

      <button
        onClick={handleThrow}
        disabled={!explanation.trim() || loading || throwing}
        className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
      >
        {loading || throwing ? 'Throwing…' : 'Throw Your Card ↑'}
      </button>

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
