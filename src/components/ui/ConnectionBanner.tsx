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

      if (newState === 'disconnected' || newState === 'unavailable' || newState === 'failed') {
        toast.error('Connection lost, reconnecting...');
      } else if (newState === 'connected' && (prev === 'disconnected' || prev === 'unavailable' || prev === 'failed')) {
        toast.success('Reconnected!');
      }
    });
  }, []);

  if (state === 'connected') return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-yellow-500 text-[#1a3a6e] text-xs font-bold text-center py-2">
      {state === 'connecting' ? '↻ Reconnecting…' : '⚠ Connection lost'}
    </div>
  );
}
