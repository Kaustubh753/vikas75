import type { GameRoom } from '@/types/game';

interface Props { room: GameRoom; playerName: string }

export default function PlayerLobby({ room, playerName }: Props) {
  const players = Object.values(room.players);
  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      <header className="bg-[#1a3a6e] px-6 py-4 flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-oswald)] text-white text-2xl uppercase tracking-widest">
          Vikas 75
        </h1>
        <span className="text-[#FFD700] font-bold tracking-widest">{room.code}</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <p className="text-[#1a3a6e] font-bold text-xl">Hey, {playerName}! 👋</p>
        <p className="text-gray-500 text-sm">Waiting for the host to start…</p>
        <div className="w-full max-w-sm">
          <p className="text-[#8899aa] uppercase tracking-widest text-xs mb-3 text-center">
            {players.length} player{players.length !== 1 ? 's' : ''} in the room
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span key={p.id} className="bg-[#1a3a6e]/10 text-[#1a3a6e] px-3 py-1 rounded-full text-sm">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
