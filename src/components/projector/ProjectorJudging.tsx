'use client';
import { useEffect } from 'react';
import { getMusicManager } from '@/lib/music';

export default function ProjectorJudging() {
  useEffect(() => {
    getMusicManager().play('drumroll');
  }, []);

  return (
    <div className="w-full h-full bg-[#0d1b35] flex flex-col items-center justify-center gap-10">
      {/* Pulsing rings */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-[#FF9933]/20 animate-ping" />
        <div className="absolute inset-4 rounded-full border-2 border-[#FF9933]/30 animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-8 rounded-full border-2 border-[#FF9933]/40 animate-ping" style={{ animationDelay: '0.6s' }} />
        <span className="text-6xl relative z-10">⚖️</span>
      </div>

      <div className="text-center">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-6xl tracking-widest">
          AI Judge Deliberates
        </h2>
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#FF9933] animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
