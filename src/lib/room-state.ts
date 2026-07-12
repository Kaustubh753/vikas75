import type { GameRoom } from '@/types/game';

/** True when `next` is an older snapshot than what we already hold, so it should be dropped.
 *  Clients receive room state from two channels (Pusher broadcast + GET poll); a slow poll can
 *  resolve after a newer broadcast and would otherwise revert the visible phase (winner → judging).
 *  `GameRoom.rev` is a monotonic write counter; legacy rooms without a rev always apply. */
export function staleRoom(prev: GameRoom | null, next: GameRoom): boolean {
  return !!prev && prev.rev != null && next.rev != null && next.rev < prev.rev;
}
