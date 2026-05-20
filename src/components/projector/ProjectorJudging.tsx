export default function ProjectorJudging() {
  return (
    <div className="h-screen w-screen bg-[#1a3a6e] flex flex-col items-center justify-center gap-8">
      <p className="font-[family-name:var(--font-oswald)] text-white text-5xl uppercase tracking-widest">
        AI Judge Deliberates…
      </p>
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-4 w-4 rounded-full bg-[#FFD700] animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-[#8aa8cc] text-sm">Weighing creativity, jugaad, and vibes…</p>
    </div>
  );
}
