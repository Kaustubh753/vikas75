'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GameRoom } from '@/types/game';

export default function AdminDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('vikas75_admin_auth');
    if (!auth) { router.push('/admin'); return; }

    fetch('/api/admin?action=rooms', { headers: { Authorization: `Basic ${auth}` } })
      .then((r) => r.json())
      .then(({ rooms, error }) => {
        if (error) setError(error);
        else setRooms(rooms ?? []);
        setLoading(false);
      });
  }, [router]);

  if (loading) return <div className="p-8 text-gray-500">Loading rooms…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="font-[family-name:var(--font-oswald)] text-[#1a3a6e] text-4xl uppercase tracking-widest mb-6">
        Admin Dashboard
      </h1>

      <section>
        <h2 className="text-[#1a3a6e] font-bold text-lg mb-3">Active Rooms ({rooms.length})</h2>
        {rooms.length === 0 ? (
          <p className="text-gray-500">No active rooms.</p>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room.code} className="bg-white rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[family-name:var(--font-oswald)] text-[#1a3a6e] text-2xl font-bold">
                    {room.code}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {room.phase}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  {Object.keys(room.players).length} players · Round {room.round}/{room.totalRounds}
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`/projector/${room.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1a3a6e] underline"
                  >
                    Projector
                  </a>
                  <a
                    href={`/host/${room.code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1a3a6e] underline"
                  >
                    Host Panel
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
