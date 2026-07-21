'use client';

export default function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={`w-full h-full rounded-2xl flex flex-col items-center justify-center relative overflow-hidden ${className ?? ''}`}
      style={{ background: '#0d1b35', border: '3px solid #FF9933' }}
    >
      {/* Crosshatch pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #FF9933 0px, #FF9933 1px, transparent 1px, transparent 14px),
            repeating-linear-gradient(-45deg, #FF9933 0px, #FF9933 1px, transparent 1px, transparent 14px)`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex h-1 rounded-full overflow-hidden" style={{ width: 44 }}>
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/50" />
          <div className="flex-1 bg-[#138808]" />
        </div>
        <p
          className="font-[family-name:var(--font-bebas)] text-[#FF9933]/50 tracking-[0.35em] text-center select-none"
          style={{ fontSize: 15 }}
        >
          VIKAS 75
        </p>
        <div className="flex h-1 rounded-full overflow-hidden" style={{ width: 44 }}>
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white/50" />
          <div className="flex-1 bg-[#138808]" />
        </div>
      </div>
    </div>
  );
}
