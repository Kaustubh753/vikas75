export default function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 overflow-hidden skeleton-pulse ${className}`}>
      <div className="p-5 space-y-3">
        <div className="h-3 bg-white/10 rounded-full w-1/3" />
        <div className="h-5 bg-white/10 rounded-full w-3/4" />
        <div className="h-3 bg-white/10 rounded-full w-1/2" />
        <div className="h-3 bg-white/10 rounded-full w-5/6" />
        <div className="h-3 bg-white/10 rounded-full w-2/3" />
      </div>
    </div>
  );
}
