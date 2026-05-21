'use client';
import { useEffect, useState } from 'react';
import { onConnectionStateChange, type PusherConnectionState } from '@/lib/pusher-client';

export default function ConnectionBanner() {
  const [state, setState] = useState<PusherConnectionState>('connected');
  useEffect(() => onConnectionStateChange(setState), []);
  if (state === 'connected') return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-yellow-500 text-[#1a3a6e] text-xs font-bold text-center py-2">
      {state === 'connecting' ? '↻ Reconnecting…' : '⚠ Connection lost'}
    </div>
  );
}
