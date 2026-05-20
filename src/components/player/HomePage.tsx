'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CodeInput from '@/components/ui/CodeInput';

interface Props {
  initialCode?: string;
}

export default function HomePage({ initialCode }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode?.toUpperCase().replace(/[^A-Z]/g, '') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canJoin = !!name.trim() && code.replace(/\s/g, '').length > 0;
  const canCreate = !!name.trim();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!canJoin) return;
    setLoading(true);
    setError('');

    const playerId = crypto.randomUUID();
    sessionStorage.setItem('vikas75_playerId', playerId);
    sessionStorage.setItem('vikas75_playerName', name.trim());

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', code: code.replace(/\s/g, ''), playerId, playerName: name.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/room/${code.replace(/\s/g, '')}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true);
    setError('');

    const hostId = crypto.randomUUID();
    sessionStorage.setItem('vikas75_playerId', hostId);
    sessionStorage.setItem('vikas75_playerName', name.trim());

    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create-room', hostId, hostName: name.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    router.push(`/host/${data.room.code}?h=${hostId}`);
  }

  return (
    <div className="min-h-screen bg-[#1a3a6e] flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Background dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />

      {/* Saffron top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF9933]" />

      {/* Logo */}
      <div className="relative mb-8 text-center">
        <h1 className="font-[family-name:var(--font-oswald)] text-white text-6xl uppercase tracking-[0.2em] leading-none">
          Vikas <span className="text-[#FF9933]">75</span>
        </h1>
        <p className="text-[#8aa8cc] text-xs tracking-[0.4em] uppercase mt-2">The Schemes Card Game</p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="bg-[#faf8f0] rounded-2xl shadow-2xl overflow-hidden">
          {/* Card top accent */}
          <div className="h-1 flex">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          <div className="p-7 space-y-6">
            {/* Name field */}
            <div>
              <label className="block text-[#1a3a6e] font-bold text-xs uppercase tracking-widest mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Priya, Raj, The Jugaad King"
                className="w-full border-2 border-[#1a3a6e]/20 rounded-xl px-4 py-3 text-base text-[#1a3a6e] placeholder:text-gray-400 focus:outline-none focus:border-[#1a3a6e] bg-white transition-colors"
                maxLength={24}
                autoFocus
              />
            </div>

            {/* Join section */}
            <form onSubmit={handleJoin} className="space-y-3">
              <label className="block text-[#1a3a6e] font-bold text-xs uppercase tracking-widest">
                Enter Room Code
              </label>
              <CodeInput value={code} onChange={setCode} disabled={loading} />
              <button
                type="submit"
                disabled={loading || !canJoin}
                className="w-full py-3.5 rounded-xl font-[family-name:var(--font-oswald)] text-lg uppercase tracking-widest transition-all
                  bg-[#1a3a6e] text-white
                  hover:bg-[#0f2347]
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-[0.98]"
              >
                {loading ? 'Joining…' : 'Join Game'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#1a3a6e]/15" />
              <span className="text-[#8899aa] text-xs uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[#1a3a6e]/15" />
            </div>

            {/* Create room */}
            <form onSubmit={handleCreate}>
              <button
                type="submit"
                disabled={loading || !canCreate}
                className="w-full py-3.5 rounded-xl font-semibold text-base transition-all
                  border-2 border-[#1a3a6e] text-[#1a3a6e]
                  hover:bg-[#1a3a6e]/5
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:scale-[0.98]"
              >
                Create New Game <span className="text-[#8899aa] font-normal text-sm">(Host)</span>
              </button>
            </form>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="relative text-[#8aa8cc]/60 text-xs mt-8 tracking-widest uppercase">
        3 – 15 players · No app needed
      </p>
    </div>
  );
}
