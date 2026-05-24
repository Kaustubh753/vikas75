'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';
import type { GameMode } from '@/types/game';

export default function HostSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>('friends');
  const [rounds, setRounds] = useState(10);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setLoading(true);
    setError('');
    const hostId = crypto.randomUUID();
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-room',
          hostId,
          hostName: 'Host',
          totalRounds: rounds,
          timerDuration: timer,
          gameMode: mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create room');
        setLoading(false);
        return;
      }
      const roomCode: string = data.room.code;
      router.push(`/projector/${roomCode}?h=${hostId}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1b35] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <LogoLockup size="md" className="mb-2" />

        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-widest text-center">
          GAME SETUP
        </h2>

        {/* Mode */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-4 font-[family-name:var(--font-inter)]">
            Game Mode
          </p>
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => setMode('friends')}
              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                mode === 'friends'
                  ? 'border-[#FF9933] bg-[#FF9933]/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-3xl">📱</span>
              <span className="font-[family-name:var(--font-bebas)] text-sm tracking-widest">
                Friends Mode
              </span>
            </motion.button>
            <motion.button
              onClick={() => setMode('crowd')}
              className={`h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                mode === 'crowd'
                  ? 'border-[#FF9933] bg-[#FF9933]/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/50 hover:text-white/70'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-3xl">📺</span>
              <span className="font-[family-name:var(--font-bebas)] text-sm tracking-widest">
                Crowd Mode
              </span>
            </motion.button>
          </div>
          <p className="text-white/40 text-xs mt-3 text-center font-[family-name:var(--font-inter)]">
            {mode === 'friends'
              ? 'Challenge shown on phones + projector'
              : 'Challenge only on projector (big screen)'}
          </p>
        </div>

        {/* Rounds */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-white/60 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
              Rounds
            </p>
            <span className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-2xl">
              {rounds}
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={15}
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
            aria-label="Number of rounds"
            className="w-full accent-[#FF9933]"
          />
          <div className="flex justify-between text-white/30 text-xs mt-1 font-[family-name:var(--font-inter)]">
            <span>5</span>
            <span>15</span>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-white/60 text-xs uppercase tracking-widest font-[family-name:var(--font-inter)]">
              Timer
            </p>
            <span className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-2xl">
              {timer}s
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={120}
            step={5}
            value={timer}
            onChange={(e) => setTimer(Number(e.target.value))}
            aria-label="Timer duration in seconds"
            className="w-full accent-[#FF9933]"
          />
          <div className="flex justify-between text-white/30 text-xs mt-1 font-[family-name:var(--font-inter)]">
            <span>30s</span>
            <span>120s</span>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center animate-shake">{error}</p>
        )}

        <motion.button
          onClick={handleCreate}
          disabled={loading}
          className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
          whileTap={{ scale: 0.95 }}
        >
          {loading ? 'Creating…' : 'Create Room →'}
        </motion.button>
      </div>
    </main>
  );
}
