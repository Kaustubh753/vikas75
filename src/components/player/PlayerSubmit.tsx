'use client';

import { useState } from 'react';
import type { GameRoom, Player } from '@/types/game';
import SchemeCard from '@/components/cards/SchemeCard';
import ChallengeCard from '@/components/cards/ChallengeCard';
import Button from '@/components/ui/Button';

interface Props { room: GameRoom; player: Player }

export default function PlayerSubmit({ room, player }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedCard = player.hand.find((c) => c.id === selectedId) ?? null;

  function toggleCard(id: string) {
    if (selectedId === id) {
      setExpandedId(expandedId === id ? null : id);
    } else {
      setSelectedId(id);
      setExpandedId(null);
    }
  }

  async function handleSubmit() {
    if (!selectedCard || !explanation.trim()) return;
    setSubmitting(true);
    setError('');

    const submission = {
      playerId: player.id,
      playerName: player.name,
      schemeCard: selectedCard,
      explanation: explanation.trim(),
      submittedAt: Date.now(),
    };

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', code: room.code, submission }),
    });
    const data = await res.json();
    if (!data.ok) setError(data.error ?? 'Submission failed');
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      <header className="bg-[#1a3a6e] px-6 py-4 flex items-center justify-between">
        <span className="font-[family-name:var(--font-oswald)] text-white text-xl uppercase tracking-widest">
          Round {room.round}
        </span>
        <span className="text-[#FFD700] font-bold">{room.code}</span>
      </header>

      <div className="p-4">
        {room.currentChallenge && (
          <ChallengeCard card={room.currentChallenge} size="phone" />
        )}
      </div>

      {/* Card hand */}
      <div className="px-4 pb-2">
        <p className="text-[#8899aa] uppercase tracking-widest text-xs mb-2">Your hand — tap to select</p>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {player.hand.map((card) => (
            <div key={card.id} className="snap-start flex-shrink-0">
              <SchemeCard
                card={card}
                selected={selectedId === card.id}
                expanded={expandedId === card.id}
                onClick={() => toggleCard(card.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Explanation + submit */}
      <div className="px-4 pb-6 mt-auto">
        {selectedCard && (
          <p className="text-[#1a3a6e] text-sm font-bold mb-2">
            Selected: {selectedCard.name}
          </p>
        )}
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Why does this scheme solve the problem? (Hinglish welcome!)"
          rows={3}
          className="w-full border-2 border-[#1a3a6e]/20 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#1a3a6e] mb-3"
          maxLength={300}
        />
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <Button
          fullWidth
          disabled={submitting || !selectedCard || !explanation.trim()}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit Answer'}
        </Button>
      </div>
    </div>
  );
}
