import Avatar from '@/lib/avatars';
import type { GameRoom, AvatarId } from '@/types/game';

interface Props { room: GameRoom; playerName: string; avatarId: AvatarId }

export default function PlayerLobby({ room, playerName, avatarId }: Props) {
  const players = Object.values(room.players);
  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      <div className="bg-[#1a3a6e] flex-shrink-0">
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/30" /><div className="flex-1 bg-[#138808]" />
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-oswald)] text-white text-xl uppercase tracking-wider">Vikas</span>
            <span className="font-[family-name:var(--font-oswald)] text-[#FF9933] text-xl uppercase tracking-wider">75</span>
          </div>
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 px-3 py-1 rounded-lg">
            <span className="font-[family-name:var(--font-oswald)] text-[#FFD700] text-lg tracking-[0.25em] font-bold">{room.code}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <Avatar id={avatarId} size={72} className="mx-auto rounded-xl shadow-lg" />
          <p className="text-[#1a3a6e] font-bold text-2xl mt-3">{playerName}</p>
          <p className="text-gray-400 text-sm">Waiting for the host to start…</p>
        </div>

        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#1a3a6e]/30 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
          ))}
        </div>

        <div className="w-full max-w-xs">
          <p className="text-[#8899aa] uppercase tracking-[0.3em] text-[10px] mb-3 text-center">
            {players.length} player{players.length !== 1 ? 's' : ''} in the room
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-[#1a3a6e]/8 border border-[#1a3a6e]/15 px-3 py-1.5 rounded-full">
                <Avatar id={p.avatarId ?? 'a1'} size={20} className="rounded-md" />
                <span className="text-[#1a3a6e] text-sm font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 py-4 text-center">
        <p className="text-gray-300 text-xs tracking-widest uppercase">Vikas 75</p>
      </div>
    </div>
  );
}
