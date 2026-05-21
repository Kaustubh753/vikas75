'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LogoLockup from '@/components/ui/LogoLockup';
import Avatar from '@/lib/avatars';
import type { GameRoom } from '@/types/game';

export default function AdminDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    const creds = sessionStorage.getItem('vikas75_admin_creds');
    if (!creds) {
      router.push('/admin');
      return;
    }
    try {
      const res = await fetch('/api/admin?action=rooms', {
        headers: { Authorization: `Basic ${creds}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('vikas75_admin_creds');
        router.push('/admin');
        return;
      }
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      setError('Failed to load rooms');
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  function handleLogout() {
    sessionStorage.removeItem('vikas75_admin_creds');
    router.push('/admin');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b2e] flex items-center justify-center">
        <p className="text-white/40 animate-pulse font-[family-name:var(--font-bebas)] text-2xl tracking-widest">
          Loading rooms…
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1b2e] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <LogoLockup size="sm" />
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white text-sm font-[family-name:var(--font-inter)] transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-widest">
            Active Rooms ({rooms.length})
          </h1>
          <button
            onClick={fetchRooms}
            className="text-[#FF9933] text-sm font-[family-name:var(--font-inter)] hover:underline"
          >
            Refresh
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 font-[family-name:var(--font-inter)]">{error}</p>
        )}

        {rooms.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-white/40 font-[family-name:var(--font-inter)]">No active rooms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => {
              const players = Object.values(room.players);
              return (
                <div key={room.code} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-[family-name:var(--font-bebas)] text-[#FF9933] text-3xl tracking-widest">
                          {room.code}
                        </span>
                        <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-[family-name:var(--font-inter)]">
                          {room.phase}
                        </span>
                        <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-[family-name:var(--font-inter)]">
                          {room.gameMode}
                        </span>
                      </div>
                      <p className="text-white/50 text-sm font-[family-name:var(--font-inter)]">
                        Host: {room.hostName} · Round {room.round}/{room.totalRounds} · {players.length} players
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`/host/${room.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#FF9933] hover:underline font-[family-name:var(--font-inter)]"
                      >
                        Host →
                      </a>
                      <a
                        href={`/projector/${room.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#FF9933] hover:underline font-[family-name:var(--font-inter)]"
                      >
                        Projector →
                      </a>
                    </div>
                  </div>

                  {players.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {players
                        .sort((a, b) => b.score - a.score)
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5"
                          >
                            <div className="rounded-md overflow-hidden">
                              <Avatar id={p.avatarId} size={20} />
                            </div>
                            <span className="text-white/70 text-xs font-[family-name:var(--font-inter)]">
                              {p.name}
                            </span>
                            <span className="text-[#FF9933] text-xs font-bold font-[family-name:var(--font-inter)]">
                              {p.score}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {room.currentChallenge && (
                    <p className="text-white/30 text-xs mt-2 font-[family-name:var(--font-inter)]">
                      Challenge: {room.currentChallenge.en}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
