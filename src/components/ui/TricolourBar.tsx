export default function TricolourBar({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-2 w-full overflow-hidden rounded-full ${className}`}>
      <div className="flex-1 bg-[#FF9933]" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-[#138808]" />
    </div>
  );
}
