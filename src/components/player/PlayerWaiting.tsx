export default function PlayerWaiting({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#faf8f0] flex flex-col items-center justify-center gap-6 p-6">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full bg-[#1a3a6e] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-[#1a3a6e] font-bold text-lg text-center">{message}</p>
      <p className="text-[#8899aa] text-sm text-center">Watch the projector screen</p>
    </div>
  );
}
