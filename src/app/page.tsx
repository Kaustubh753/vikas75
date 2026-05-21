'use client';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import LogoLockup from '@/components/ui/LogoLockup';
import CodeInput from '@/components/ui/CodeInput';
import AvatarPicker from '@/components/ui/AvatarPicker';
import SocialLinks from '@/components/ui/SocialLinks';
import type { AvatarId } from '@/types/game';

export default function HomePage() {
  const router = useRouter();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarId>('a1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shownIdleToast = useRef(false);

  // Easter egg: idle toast after 30 seconds of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      if (shownIdleToast.current) return;
      timer = setTimeout(() => {
        if (shownIdleToast.current) return;
        shownIdleToast.current = true;
        toast("Still deciding? This game was built faster than you're making this decision. — Kaustubh & Claude 🤖", {
          duration: 5000,
          position: 'bottom-center',
        });
      }, 30000);
    };

    reset();
    window.addEventListener('click', reset);
    window.addEventListener('keydown', reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', reset);
      window.removeEventListener('keydown', reset);
    };
  }, []);

  useEffect(() => {
    // Try to restore session
    const playerId = localStorage.getItem('vikas75_playerId');
    const playerName = localStorage.getItem('vikas75_playerName');
    const savedAvatarId = localStorage.getItem('vikas75_avatarId') as AvatarId | null;
    const roomCode = localStorage.getItem('vikas75_roomCode');
    if (playerId && playerName && savedAvatarId && roomCode) {
      router.replace(`/room/${roomCode}`);
    }
  }, [router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || code.length !== 4) return;
    setLoading(true);
    setError('');
    const playerId = crypto.randomUUID();
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code, playerId, playerName: name.trim(), avatarId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not join room');
        setLoading(false);
        return;
      }
      localStorage.setItem('vikas75_playerId', playerId);
      localStorage.setItem('vikas75_playerName', name.trim());
      localStorage.setItem('vikas75_avatarId', avatarId);
      localStorage.setItem('vikas75_roomCode', code);
      router.push(`/room/${code}`);
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1b2e] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <LogoLockup size="lg" className="mb-4" />

        {/* Tricolour bar */}
        <div className="w-full h-1.5 flex mb-8 rounded-full overflow-hidden">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        {!showJoinForm ? (
          <div className="w-full flex flex-col gap-4 animate-fade-in">
            <motion.button
              onClick={() => setShowJoinForm(true)}
              className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
              whileTap={{ scale: 0.95 }}
            >
              Join Game
            </motion.button>
            <motion.button
              onClick={() => router.push('/host/setup')}
              className="w-full h-14 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
              whileTap={{ scale: 0.95 }}
            >
              Host a Game
            </motion.button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="w-full flex flex-col gap-5 animate-slide-up">
            <div>
              <label
                htmlFor="player-name"
                className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-[family-name:var(--font-inter)]"
              >
                Your Name
              </label>
              <input
                id="player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full h-14 rounded-xl border-2 border-white/20 bg-white/5 text-white px-4 text-lg focus:outline-none focus:border-[#FF9933] focus:ring-2 focus:ring-[#FF9933]/40 placeholder-white/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2 font-[family-name:var(--font-inter)]">
                Room Code
              </label>
              <CodeInput value={code} onChange={setCode} disabled={loading} />
            </div>

            <AvatarPicker value={avatarId} onChange={setAvatarId} disabled={loading} />

            {error && (
              <p className="text-red-400 text-sm text-center animate-shake">{error}</p>
            )}

            <motion.button
              type="submit"
              disabled={loading || !name.trim() || code.length !== 4}
              className="w-full h-14 bg-[#FF9933] hover:bg-[#e8872a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
              whileTap={{ scale: 0.95 }}
            >
              {loading ? 'Joining…' : 'Join Game →'}
            </motion.button>

            <motion.button
              type="button"
              onClick={() => { setShowJoinForm(false); setError(''); }}
              className="text-white/40 text-sm text-center hover:text-white/60 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              ← Back
            </motion.button>
          </form>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <a
            href="/how-to-play"
            className="text-white/40 text-sm hover:text-white/70 transition-colors underline underline-offset-2"
          >
            How to Play
          </a>
          <SocialLinks />
        </div>
      </div>
    </main>
  );
}
