/** True when `next` is an older snapshot than what we already hold, so it should be dropped.
 *  Clients receive room state from two channels (Pusher broadcast + GET poll); a slow poll can
 *  resolve after a newer broadcast and would otherwise revert the visible phase (winner → judging).
 *  `GameRoom.rev` is a monotonic write counter; legacy rooms without a rev always apply.
 *
 *  Typed on the one field it reads rather than on `GameRoom`, so it takes a `BroadcastRoom`
 *  (what a Pusher payload actually is) as readily as the GET's scrubbed room — the guard cares
 *  about the revision, not about which secrets the caller's shape happens to carry. */
export function staleRoom(prev: { rev?: number } | null, next: { rev?: number }): boolean {
  return !!prev && prev.rev != null && next.rev != null && next.rev < prev.rev;
}
