import Pusher from 'pusher';
import type { GameRoom, SchemeCard } from '@/types/game';

// Server-side only — never import this file in client components.
// Client components must import from @/lib/pusher-client instead.

// Construct the SDK only when fully configured. The `pusher` package throws if any of
// appId/key/secret/cluster is missing, which at module scope would crash the import and
// 500 the entire /api/game route. Real-time is best-effort (clients poll as a fallback),
// so a missing config should degrade to no-op broadcasts, mirroring the Redis fallback.
const pusherConfigured = Boolean(
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER,
);

export const pusherServer = pusherConfigured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    })
  : null;

// Warn once (not per broadcast) so logs aren't flooded when Pusher is unconfigured.
let warnedNoPusher = false;

export function getRoomChannel(code: string): string {
  // private- prefix triggers Pusher channel authorisation via /api/pusher/auth.
  // Always uppercase — must match the client-side getRoomChannel in pusher-client.ts.
  return `private-game-${code.toUpperCase()}`;
}

// Strip heavy fields from scheme cards — keep only id, name, hi for display.
// The projector only needs name + Hindi name (not desc/bullets).
// Full card details come from player's cached hand (set at join time).
function stripCard(card: SchemeCard): SchemeCard {
  return { id: card.id, name: card.name, hi: card.hi, desc: '', bullets: [] };
}

// Strip large data from room before sending via Pusher (free tier: 10 KB/message limit).
// Players get full room (including hands) via GET /api/game on initial load.
function stripForBroadcast(room: GameRoom) {
  // Never broadcast secrets: the host credential or per-player tokens.
  const { hostId: _h, tokens: _t, ...safe } = room;
  void _h; void _t;
  return {
    ...safe,
    // Strip hands entirely — each hand is ~3 KB
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, { ...p, hand: [] }])
    ),
    // Strip desc/bullets from scheme cards in submissions
    submissions: Object.fromEntries(
      Object.entries(room.submissions).map(([id, s]) => [
        id,
        { ...s, schemeCard: stripCard(s.schemeCard) },
      ])
    ),
    // Strip desc/bullets from verdict cards
    lastVerdict: room.lastVerdict
      ? {
          ...room.lastVerdict,
          schemeCard: stripCard(room.lastVerdict.schemeCard),
          rankings: room.lastVerdict.rankings.map((r) => ({
            ...r,
            schemeCard: stripCard(r.schemeCard),
          })),
        }
      : null,
    // Strip chat messages (sent via separate game:chat events; initial load via GET)
    messages: [],
  };
}

// Best-effort Pusher trigger. Real-time delivery is a convenience, not a source of
// truth: every client also polls GET /api/game as a fallback, and all state is already
// persisted to Redis before we broadcast. So a Pusher failure (outage, rate limit,
// blocked egress) must never turn a successful mutation into a 500 — we log and move on.
export async function triggerEvent(channel: string, event: string, data: unknown): Promise<void> {
  if (!pusherServer) {
    if (!warnedNoPusher) {
      warnedNoPusher = true;
      console.warn('[pusher] not configured (missing PUSHER_* env vars) — real-time disabled, clients fall back to polling');
    }
    return;
  }
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (err) {
    console.warn(`[pusher] broadcast of "${event}" failed (clients fall back to polling):`, err instanceof Error ? err.message : err);
  }
}

export async function broadcastRoom(room: GameRoom): Promise<void> {
  await triggerEvent(getRoomChannel(room.code), 'game:room-updated', stripForBroadcast(room));
}
