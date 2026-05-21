import PusherClient from 'pusher-js';

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClientInstance;
}

export function getRoomChannel(code: string): string {
  return `game-${code}`;
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
