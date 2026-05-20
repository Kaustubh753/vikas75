'use client';

import { useState } from 'react';
import type { GameRoom, Player, SchemeCard } from '@/types/game';

interface Props { room: GameRoom; player: Player }

export default function PlayerSubmit({ room, player }: Props) {
  const [selectedCard, setSelectedCard] = useState<SchemeCard | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleCardTap(card: SchemeCard) {
    if (selectedCard?.id === card.id) {
      // Second tap on selected card — toggle expanded
      setExpandedId(expandedId === card.id ? null : card.id);
    } else {
      setSelectedCard(card);
      setExpandedId(null);
    }
  }

  async function handleSubmit() {
    if (!selectedCard || !explanation.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        code: room.code,
        submission: {
          playerId: player.id,
          playerName: player.name,
          schemeCard: selectedCard,
          explanation: explanation.trim(),
          submittedAt: Date.now(),
        },
      }),
    });
    const data = await res.json();
    if (!data.ok) setError(data.error ?? 'Submission failed');
    setSubmitting(false);
  }

  const challenge = room.currentChallenge;

  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a3a6e] flex-shrink-0">
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/30" /><div className="flex-1 bg-[#138808]" />
        </div>
        <div className="px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[#8aa8cc] text-[10px] uppercase tracking-widest">Round {room.round}</p>
            <p className="font-[family-name:var(--font-oswald)] text-white text-lg uppercase tracking-wider">Submit Answer</p>
          </div>
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-1 rounded-lg">
            <span className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-base tracking-[0.2em] font-bold">{room.code}</span>
          </div>
        </div>
      </div>

      {/* Challenge card (compact) */}
      {challenge && (
        <div className="mx-4 mt-4 rounded-xl overflow-hidden shadow-md flex-shrink-0" style={{ background: '#1a3a6e' }}>
          <div className="h-0.5 bg-gradient-to-r from-[#FF9933] via-[#FFD700] to-[#FF9933]" />
          <div className="px-4 py-4 text-center">
            <p className="text-[#8aa8cc] tracking-[0.3em] uppercase text-[9px] mb-2">Problem Statement</p>
            <p className="font-[family-name:var(--font-oswald)] text-white font-bold uppercase text-sm leading-snug">
              {challenge.en}
            </p>
            <p className="font-[family-name:var(--font-devanagari)] text-[#c8d8f0] text-xs mt-1.5 leading-snug">
              {challenge.hi}
            </p>
          </div>
        </div>
      )}

      {/* Card selection label */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <p className="text-[#8899aa] text-[10px] uppercase tracking-[0.3em]">
          Your Hand — Tap to select · Tap again to expand
        </p>
      </div>

      {/* Horizontal card scroll */}
      <div className="flex-shrink-0 overflow-x-auto pb-2">
        <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
          {player.hand.map(card => {
            const isSelected = selectedCard?.id === card.id;
            const isExpanded = expandedId === card.id;
            return (
              <button
                key={card.id}
                onClick={() => handleCardTap(card)}
                className={`rounded-xl overflow-hidden text-left transition-all active:scale-95 flex-shrink-0 ${
                  isSelected
                    ? 'ring-2 ring-[#1a3a6e] shadow-lg shadow-[#1a3a6e]/20'
                    : 'ring-1 ring-black/5 shadow-sm'
                }`}
                style={{ width: isExpanded ? '220px' : '160px', background: '#faf8f0' }}
              >
                <div className="h-0.5 flex">
                  <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white border-t border-gray-100" /><div className="flex-1 bg-[#138808]" />
                </div>
                <div className="p-3">
                  <p className="text-[#8899aa] tracking-widest uppercase text-[8px] mb-1.5">scheme</p>
                  <p className={`font-bold text-[#1a3a6e] uppercase leading-tight text-xs ${isSelected ? '' : 'line-clamp-2'}`}>
                    {card.name}
                  </p>
                  <p className="font-[family-name:var(--font-devanagari)] text-[#1a3a6e] text-[10px] mt-0.5">
                    {card.hi}
                  </p>
                  {isExpanded && (
                    <>
                      <p className="text-gray-500 text-[10px] mt-2 leading-relaxed">{card.desc}</p>
                      <ul className="mt-2 space-y-0.5">
                        {card.bullets.map((b, i) => (
                          <li key={i} className="flex gap-1.5 text-[9px] text-gray-500">
                            <span className="text-[#FF9933] flex-shrink-0 mt-0.5">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {isSelected && !isExpanded && (
                    <p className="text-[#1a3a6e]/50 text-[9px] mt-1.5">Tap to expand ↓</p>
                  )}
                </div>
                <p className="text-[#8899aa] text-[8px] tracking-widest uppercase text-center pb-2">Vikas 75</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation + submit */}
      <div className="flex-1 flex flex-col px-4 pb-5 pt-3 gap-3 min-h-0">
        {selectedCard && (
          <div className="bg-[#1a3a6e]/5 border border-[#1a3a6e]/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#1a3a6e]" />
            <p className="text-[#1a3a6e] text-sm font-bold flex-1 truncate">{selectedCard.name}</p>
            <button onClick={() => setSelectedCard(null)} className="text-[#8899aa] text-xs hover:text-gray-500">✕</button>
          </div>
        )}

        <textarea
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          placeholder="Why does this scheme solve the problem? Hinglish welcome! 🙏"
          rows={3}
          maxLength={280}
          className="w-full border-2 border-[#1a3a6e]/15 rounded-xl px-4 py-3 text-sm resize-none bg-white text-[#1a3a6e] placeholder:text-gray-300 focus:outline-none focus:border-[#1a3a6e] transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-[10px]">{explanation.length}/280</span>
          {explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1 && explanation.trim() && (
            <span className="text-[#FF9933] text-[10px] font-bold">✦ Bonus point eligible!</span>
          )}
        </div>

        {error && <p className="text-red-500 text-xs text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedCard || !explanation.trim()}
          className="w-full py-4 rounded-xl font-[family-name:var(--font-oswald)] text-lg uppercase tracking-widest transition-all
            bg-[#1a3a6e] text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:bg-[#0f2347]
            active:scale-[0.98]"
        >
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
}
