'use client';
import LogoLockup from '@/components/ui/LogoLockup';

/* Ghost of the player's room screen — PlayerView's header bar plus PlayerLobby's phase pill,
 * room-code tiles, invite button, seat grid and waiting bar — so identity hydration and the
 * first fetch resolve into the layout that's already on screen rather than replacing it.
 * Dimensions mirror those two components; keep them in step. */

const CREAM = 'rgba(250,248,240,';

export default function PlayerLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#08070f' }}>

      {/* PlayerView's header — the mark is real, the controls are ghosted */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="min-w-0 overflow-hidden"><LogoLockup size="sm" /></div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="skeleton-pulse rounded-full" style={{ width: 36, height: 36, background: `${CREAM}0.06)` }} />
          <div className="skeleton-pulse rounded-full" style={{ width: 68, height: 34, background: `${CREAM}0.06)` }} />
        </div>
      </div>

      <div className="flex flex-col items-center px-4 pb-6" style={{ gap: 18, paddingTop: 8 }}>

      {/* Phase pill + count */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <div className="skeleton-pulse rounded-full" style={{ width: 62, height: 22, background: 'rgba(255,153,51,0.12)', border: '1px solid rgba(255,153,51,0.22)' }} />
        <div className="skeleton-pulse rounded-full" style={{ width: 78, height: 11, background: `${CREAM}0.07)` }} />
      </div>

      {/* Room code */}
      <div className="flex flex-col items-center" style={{ gap: 9 }}>
        <div className="skeleton-pulse rounded-full" style={{ width: 76, height: 9, background: `${CREAM}0.07)` }} />
        <div className="flex" style={{ gap: 9 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="skeleton-pulse"
                 style={{
                   width: 54, height: 64, borderRadius: 10,
                   background: `${CREAM}0.55)`,
                   boxShadow: '0 10px 22px rgba(0,0,0,0.45), inset 0 -2px 0 rgba(0,0,0,0.08)',
                   animationDelay: `${i * 0.07}s`,
                 }} />
          ))}
        </div>
      </div>

      {/* Invite button */}
      <div className="skeleton-pulse rounded-full"
           style={{ width: 148, height: 40, border: '1px solid rgba(255,153,51,0.25)', background: 'rgba(255,153,51,0.05)' }} />

      {/* Seats */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div className="skeleton-pulse rounded-full mx-auto"
             style={{ width: 96, height: 9, background: `${CREAM}0.07)`, marginBottom: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton-pulse"
                 style={{
                   // Matches a filled SeatCard: 54px avatar + name + badge, not the shorter
                   // open-seat placeholder.
                   height: 140, borderRadius: 16,
                   background: 'linear-gradient(180deg,rgba(26,58,110,0.4) 0%,rgba(26,58,110,0.16) 100%)',
                   border: '1px solid rgba(255,153,51,0.14)',
                   animationDelay: `${i * 0.09}s`,
                 }} />
          ))}
        </div>
      </div>

      {/* Waiting bar */}
      <div className="flex items-center rounded-full"
           style={{ gap: 10, border: '1px solid rgba(255,153,51,0.24)', background: 'rgba(255,153,51,0.05)', padding: '10px 18px' }}>
        <span className="flex" style={{ gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} className="animate-bounce rounded-full"
                  style={{ width: 5, height: 5, background: 'rgba(255,153,51,0.7)', animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
        <span className="font-[family-name:var(--font-inter)]"
              style={{ fontSize: 12.5, color: `${CREAM}0.6)` }}>Connecting…</span>
        </div>
      </div>
    </div>
  );
}
