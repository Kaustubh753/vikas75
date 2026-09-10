import PusherClient from 'pusher-js';
import { getRoomChannel } from '@/lib/room-channel';
import type { PusherEventMap } from '@/types/game';

let pusherClientInstance: PusherClient | null = null;

// Mirrors the server-side guard in pusher.ts: constructing the SDK without an app key throws,
// and because this runs inside a component effect that exception takes the whole screen down to
// the error boundary ("Something broke") rather than degrading. Return null when unconfigured so
// callers skip realtime and fall back to their existing GET poll.
function isPusherConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_PUSHER_KEY && !!process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
}

export function getPusherClient(): PusherClient | null {
  if (!isPusherConfigured()) return null;
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      // Channel authorisation — the server verifies the room exists before allowing subscription.
      // Prevents subscribing to arbitrary/non-existent rooms from outside the game.
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
      },
    });
  }
  return pusherClientInstance;
}

export { getRoomChannel } from '@/lib/room-channel';

/**
 * Subscribe to a room's channel and bind handlers, returning a release function.
 *
 * Why this exists rather than `pusher.subscribe`/`pusher.unsubscribe` at each call site:
 * pusher-js keeps ONE channel object per name on the singleton client — `Channels.add` returns
 * the cached one — and `pusher.unsubscribe(name)` DELETES it from the registry, while inbound
 * events are routed by looking the name up in that registry. Two components on the same screen
 * (ProjectorView for `game:room-updated`/`music:toggle`, EmoteOverlay for `emote`) therefore
 * shared one channel, and whichever unmounted first silently orphaned the other's bindings —
 * permanently, since neither effect re-runs while `code` is unchanged. The projector would drop
 * to poll-only for the rest of the session, with no error anywhere, the moment a transient 404
 * unmounted the emote layer for one render.
 *
 * Refcounting the name fixes it for every consumer, including any added later: the real
 * `unsubscribe` happens only when the last subscriber releases.
 */
const roomSubscribers = new Map<string, number>();

type ChannelHandlers = { [E in keyof PusherEventMap]?: (payload: PusherEventMap[E]) => void };

export function subscribeRoom(code: string, handlers: ChannelHandlers): () => void {
  const pusher = getPusherClient();
  if (!pusher) return () => {}; // realtime unconfigured — callers fall back to their GET poll
  const name = getRoomChannel(code);
  const channel = pusher.subscribe(name);
  roomSubscribers.set(name, (roomSubscribers.get(name) ?? 0) + 1);

  const bound = Object.entries(handlers) as [string, (payload: never) => void][];
  for (const [event, fn] of bound) channel.bind(event, fn);

  let released = false;
  return () => {
    if (released) return; // an effect cleanup must never double-decrement the refcount
    released = true;
    for (const [event, fn] of bound) channel.unbind(event, fn);
    const left = (roomSubscribers.get(name) ?? 1) - 1;
    if (left > 0) {
      roomSubscribers.set(name, left);
      return;
    }
    roomSubscribers.delete(name);
    pusher.unsubscribe(name);
  };
}

export type PusherConnectionState = 'connected' | 'connecting' | 'unavailable' | 'disconnected' | 'failed';

/**
 * Subscribe to Pusher connection state changes.
 * Returns a cleanup function to call on unmount.
 */
export function onConnectionStateChange(
  callback: (state: PusherConnectionState) => void
): () => void {
  const pusher = getPusherClient();
  // Unconfigured: report a steady "connected" so the banner stays hidden. There's no socket to
  // lose, and the poll keeps the screen live — a permanent "connection lost" bar would be a lie.
  if (!pusher) { callback('connected'); return () => {}; }
  const handler = ({ current }: { current: string; previous: string }) => {
    callback(current as PusherConnectionState);
  };
  pusher.connection.bind('state_change', handler);
  // Fire immediately with current state
  callback(pusher.connection.state as PusherConnectionState);
  return () => pusher.connection.unbind('state_change', handler);
}
