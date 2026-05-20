import type { SchemeCard as SchemeCardType } from '@/types/game';
import TricolourBar from '@/components/ui/TricolourBar';

interface Props {
  card: SchemeCardType;
  selected?: boolean;
  expanded?: boolean;
  onClick?: () => void;
}

export default function SchemeCard({ card, selected, expanded, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col rounded-xl p-5 cursor-pointer transition-all select-none
        ${selected ? 'ring-2 ring-[#1a3a6e] bg-[#eaf0fb]' : 'bg-[#faf8f0]'}
        ${onClick ? 'active:scale-95' : ''}
      `}
      style={{ minWidth: '220px', maxWidth: '280px' }}
    >
      {/* Label */}
      <p className="text-[#8899aa] tracking-widest uppercase text-[10px] font-medium text-center mb-2">
        scheme
      </p>

      {/* English name */}
      <p className="font-bold text-[#1a3a6e] uppercase text-center text-base leading-tight">
        {card.name}
      </p>

      {/* Hindi name */}
      <p className="font-[family-name:var(--font-devanagari)] font-bold text-[#1a3a6e] text-center text-sm mt-1">
        {card.hi}
      </p>

      {/* Description */}
      <p className="text-gray-600 text-center text-sm mt-2">{card.desc}</p>

      {/* Tricolour divider */}
      <TricolourBar className="my-3" />

      {/* Bullets — only shown when expanded */}
      {expanded && (
        <ul className="text-xs text-gray-700 space-y-1 text-left">
          {card.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[#FF9933] flex-shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Branding */}
      <p className="text-[#8899aa] text-[10px] mt-4 text-center tracking-widest uppercase">Vikas 75</p>
    </div>
  );
}
