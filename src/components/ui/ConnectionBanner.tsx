'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { onConnectionStateChange, type PusherConnectionState } from '@/lib/pusher-client';

export default function ConnectionBanner() {
  const [state, setState] = useState<PusherConnectionState>('connected');
  const prevStateRef = useRef<PusherConnectionState>('connected');

  useEffect(() => {
    return onConnectionStateChange((newState) => {
      const prev = prevStateRef.current;
      prevStateRef.current = newState;
      setState(newState);

      // The banner below is the persistent "disconnected" indicator, so only toast the
      // recovery (a nice confirmation once the banner disappears) — no redundant lost toast.
      if (newState === 'connected' && (prev === 'disconnected' || prev === 'unavailable' || prev === 'failed')) {
        toast.success('Reconnected!');
      }
    });
  }, []);

  if (state === 'connected') return null;
  // In-flow (not fixed) so it pushes the page header down instead of overlapping it.
  return (
    <div className="w-full bg-yellow-500 text-[#173458] text-xs font-bold text-center py-2">
      {state === 'connecting' ? '↻ Reconnecting…' : '⚠ Connection lost'}
    </div>
  );
}
