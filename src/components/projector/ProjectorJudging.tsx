export default function ProjectorJudging() {
  return (
    <div
      className="h-screen w-screen bg-[#0f2347] flex flex-col items-center justify-center gap-10 relative overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#ffffff06 1px, transparent 1px)', backgroundSize: '32px 32px' }}
    >
      <div className="h-1.5 absolute top-0 left-0 right-0 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Pulsing ring effect */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-48 h-48 rounded-full border-2 border-[#FF9933]/20 animate-ping" />
        <div className="absolute w-36 h-36 rounded-full border-2 border-[#FF9933]/30 animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="w-24 h-24 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/40 flex items-center justify-center">
          <span className="text-4xl">⚖️</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="font-[family-name:var(--font-oswald)] text-white text-5xl uppercase tracking-widest">
          AI Judge Deliberates
        </p>
        <p className="text-[#8aa8cc] text-lg">Weighing creativity, jugaad, and desi ingenuity…</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-[#FF9933]"
            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>

      <div className="absolute bottom-6">
        <span className="font-[family-name:var(--font-oswald)] text-white/20 text-sm tracking-widest uppercase">Vikas 75</span>
      </div>
    </div>
  );
}
