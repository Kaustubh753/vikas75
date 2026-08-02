import PusherClient from 'pusher-js';

let pusherClientInstance: PusherClient | null = null;

// Mirrors the server-side guard in pusher.ts: constructing the SDK without an app key throws,
// and because this runs inside a component effect that exception takes the whole screen down to
// the error boundary ("Something broke") rather than degrading. Return null when unconfigured so
// callers skip realtime and fall back to their existing GET poll.
export function isPusherConfigured(): boolean {
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

export function getRoomChannel(code: string): string {
  // private- prefix triggers Pusher channel auth; must match server-side getRoomChannel in pusher.ts
  return `private-game-${code.toUpperCase()}`;
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
