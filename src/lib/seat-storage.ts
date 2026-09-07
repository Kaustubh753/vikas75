// Per-room seat credentials in localStorage — the client half of durable reconnection.
//
// The server has always allowed an existing seat to rejoin in ANY phase, provided the caller
// proves the seat's token (the idempotent-rejoin branch in route.ts `join`). What used to make
// reconnection fragile was purely client-side: identity lived in GLOBAL keys
// (`vikas75_playerId` / `vikas75_token` / …), so joining a second room overwrote the first
// room's credentials, and a lost token forced the name-based stale-seat reclaim with its 45 s
// wait. Storing one record per room code fixes both: the same device always finds its exact
// seat instantly, and playing in two rooms no longer cross-contaminates tokens.
//
// The legacy global keys are still written alongside (older readers and the join-form prefill
// use them), but per-room records win wherever both exist. All storage access is try/caught —
// private mode and enterprise policies can make localStorage THROW, not just return null.

export interface StoredSeat {
  playerId: string;
  /** The seat's auth credential (see cross-cutting concern #1). Never put it in a URL. */
  token: string;
  name: string;
  avatarId: string;
}

const seatKey = (code: string) => `vikas75_seat_${code.trim().toUpperCase()}`;

export function loadSeat(code: string): StoredSeat | null {
  try {
    const raw = localStorage.getItem(seatKey(code));
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<StoredSeat>;
    if (typeof s.playerId !== 'string' || !s.playerId || typeof s.token !== 'string') return null;
    return {
      playerId: s.playerId,
      token: s.token,
      name: typeof s.name === 'string' ? s.name : '',
      avatarId: typeof s.avatarId === 'string' && s.avatarId ? s.avatarId : 'a1',
    };
  } catch {
    return null;
  }
}

export function saveSeat(code: string, seat: StoredSeat): void {
  try {
    localStorage.setItem(seatKey(code), JSON.stringify(seat));
  } catch { /* storage blocked — reconnection degrades to the name-based reclaim */ }
}

export function clearSeat(code: string): void {
  try {
    localStorage.removeItem(seatKey(code));
  } catch { /* nothing persisted to clear */ }
}

/**
 * The token to send with actions in this room: the room's own seat record when one exists,
 * else the legacy global key. Read at call time (not captured at mount) so two tabs playing
 * two rooms each send their own room's credential.
 */
export function seatToken(code: string): string {
  const seat = loadSeat(code);
  if (seat?.token) return seat.token;
  try {
    return localStorage.getItem('vikas75_token') ?? '';
  } catch {
    return '';
  }
}
