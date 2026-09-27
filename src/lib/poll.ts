import type { GamePhase } from '@/types/game';

/**
 * How long to wait before the next fallback GET, in ms.
 *
 * Pusher is the real-time channel; this poll is what keeps a screen live when it is
 * unavailable — no PUSHER env vars, blocked egress, a dropped socket, or a room large enough
 * to exceed Pusher's payload limit. Fast while a round is in motion so a phase change (the
 * round ending, the verdict landing) reaches the screen in a few seconds rather than looking
 * like "the round won't end"; slow while idle, to save load.
 *
 * The jitter is bug #18's fix: without it, every client in a large room that has fallen back
 * to polling lands on the same 3 s beat and stampedes the API. It must be re-rolled per
 * interval, which is why this returns a number to compute at each scheduling rather than a
 * constant. Both PlayerView and ProjectorView had their own byte-identical copy of this —
 * the kind of pair that agrees until the day one of them is tuned.
 */
export function pollIntervalMs(phase: GamePhase | undefined, role: 'player' | 'projector' = 'player'): number {
  const active = phase === 'submission' || phase === 'reveal' || phase === 'judging' || phase === 'winner';
  if (active) return 3_000 + Math.random() * 1_500;
  // The big screen is one client per room, and in the lobby it is the join feedback: a scan
  // that surfaces half a minute later reads as a broken code, so the projector keeps a 5 to 7 s
  // beat there. Phones stay on the slow idle poll — twenty of them on 5 s would be the stampede.
  if (role === 'projector' && phase === 'lobby') return 5_000 + Math.random() * 2_000;
  return 30_000 + Math.random() * 8_000;
}
