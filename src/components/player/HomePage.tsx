'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface Props {
  initialCode?: string;
}

export default function HomePage({ initialCode }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || code.length !== 4) return;
    setLoading(true);
    setError('');

    const playerId = crypto.randomUUID();
    sessionStorage.setItem('vikas75_playerId', playerId);
    sessionStorage.setItem('vikas75_playerName', name.trim());
    sessionStorage.setItem('vikas75_isHost', '');

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        code: code.toUpperCase(),
        playerId,
        playerName: name.trim(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/room/${code.toUpperCase()}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    const hostId = crypto.randomUUID();
    sessionStorage.setItem('vikas75_playerId', hostId);
    sessionStorage.setItem('vikas75_playerName', name.trim());
    sessionStorage.setItem('vikas75_isHost', '1');

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-room', hostId, hostName: name.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/host/${data.room.code}`);
  }

  return (
    <div className="min-h-screen bg-[#1a3a6e] flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <h1 className="font-[family-name:var(--font-oswald)] text-white text-6xl uppercase tracking-widest">
          Vikas 75
        </h1>
        <p className="text-[#8aa8cc] text-sm mt-1 tracking-widest uppercase">The Schemes Card Game</p>
      </div>

      <div className="bg-[#faf8f0] rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-5">
        <div>
          <label className="block text-[#1a3a6e] font-bold text-sm mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya, Raj, The Jugaad King"
            className="w-full border-2 border-[#1a3a6e]/20 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#1a3a6e]"
            maxLength={24}
            autoFocus
          />
        </div>

        <form onSubmit={handleJoin} className="space-y-2">
          <label className="block text-[#1a3a6e] font-bold text-sm mb-1">Join a game</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            placeholder="Enter 4-letter code"
            className="w-full border-2 border-[#1a3a6e]/20 rounded-lg px-4 py-3 text-base uppercase tracking-[0.3em] text-center font-bold focus:outline-none focus:border-[#1a3a6e]"
            maxLength={4}
          />
          <Button
            type="submit"
            fullWidth
            disabled={loading || !name.trim() || !code.trim()}
          >
            {loading ? 'Joining…' : 'Join Game'}
          </Button>
        </form>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-[#1a3a6e]/20" />
          <span className="text-[#8899aa] text-sm">or</span>
          <hr className="flex-1 border-[#1a3a6e]/20" />
        </div>

        <form onSubmit={handleCreate}>
          <Button type="submit" variant="secondary" fullWidth disabled={loading || !name.trim()}>
            Create New Game (Host)
          </Button>
        </form>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
