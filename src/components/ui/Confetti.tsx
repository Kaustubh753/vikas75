'use client';
import { useState } from 'react';

export default function Confetti() {
  // Generated once via a lazy state initializer — keeps the random values stable across
  // re-renders without calling an impure function (Math.random) during render.
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: ['#FF9933', '#FFFFFF', '#138808', '#FFD700', '#1a3a6e'][
        Math.floor(Math.random() * 5)
      ],
      width: `${6 + Math.random() * 8}px`,
      height: `${10 + Math.random() * 6}px`,
    })),
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            background: p.color,
            animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
}
