export default function PlayerWaiting({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a3a6e] flex-shrink-0">
        <div className="h-1 flex">
          <div className="flex-1 bg-[#FF9933]" /><div className="flex-1 bg-white/30" /><div className="flex-1 bg-[#138808]" />
        </div>
        <div className="px-5 py-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-[family-name:var(--font-oswald)] text-white text-xl uppercase tracking-wider">Vikas</span>
            <span className="font-[family-name:var(--font-oswald)] text-[#FF9933] text-xl uppercase tracking-wider">75</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {/* Pulsing dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#1a3a6e]"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>

        <div className="text-center space-y-2">
          <p className="text-[#1a3a6e] font-bold text-xl">{message}</p>
          <p className="text-gray-400 text-sm">Watch the big screen</p>
        </div>
      </div>

      <div className="flex-shrink-0 py-4 text-center">
        <p className="text-gray-300 text-xs tracking-widest uppercase">Vikas 75</p>
      </div>
    </div>
  );
}
