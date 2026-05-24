import PusherClient from 'pusher-js';

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
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
  const handler = ({ current }: { current: string; previous: string }) => {
    callback(current as PusherConnectionState);
  };
  pusher.connection.bind('state_change', handler);
  // Fire immediately with current state
  callback(pusher.connection.state as PusherConnectionState);
  return () => pusher.connection.unbind('state_change', handler);
}
