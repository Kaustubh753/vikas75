'use client';
import LogoLockup from '@/components/ui/LogoLockup';

/* A projector opening cold nearly always lands on the lobby, so this is a ghost of that screen
 * at the same scale and in the same places: brand mark top-left, the glass join card with its
 * QR square and four cream code tiles, a row of seats, the waiting bar. The point is that when
 * the room arrives the content fills in where the placeholders already are, instead of the
 * whole stage being replaced by a differently-shaped one.
 *
 * The tile and seat dimensions are the same expressions ProjectorLobby uses — if you change
 * them there, change them here or the pieces will jump. */

const CREAM = 'rgba(250,248,240,';

export default function ProjectorLoading() {
  // Matches ProjectorLobby's sizing at the 1920 baseline; these are viewport-relative so the
  // ghost tracks the real thing on 720p as well.
  const tileW = 'min(5.2vw, 76px)';
  const tileH = 'calc(min(5.2vw, 76px) * 1.31)';
  const qr = 'min(9.4vw, 140px)';
  const seatW = 'min(11vw, 166px)';
  const seatH = 'calc(min(11vw, 166px) * 1.15)';

  return (
    <div className="w-screen h-screen relative overflow-hidden" style={{ background: '#08070f' }}>
      {/* Tricolour strip — real, not a placeholder, so the brand lands on frame one */}
      <div className="absolute top-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white/20" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="w-full h-full flex flex-col" style={{ padding: 'clamp(24px, 2.4vw, 48px)' }}>
        {/* Header — the mark is real; the phase pill and status line are ghosted */}
        <div className="flex items-start justify-between">
          <div className="flex items-center" style={{ gap: 16 }}>
            <LogoLockup size="md" />
            <div className="skeleton-pulse rounded-full"
                 style={{ width: 66, height: 26, background: 'rgba(255,153,51,0.10)', border: '1px solid rgba(255,153,51,0.22)' }} />
          </div>
          <div className="skeleton-pulse rounded-full"
               style={{ width: 'clamp(120px, 9vw, 175px)', height: 12, background: `${CREAM}0.07)`, marginTop: 6 }} />
        </div>

        {/* Distributed, not centred — the same reasoning (and the same space-evenly) as the
            lobby body, so the join card and seats land where the ghost put them. */}
        <div className="flex-1 flex flex-col items-center"
             style={{ justifyContent: 'space-evenly', gap: 'clamp(18px, 2.6vh, 34px)', paddingBottom: 'clamp(6px, 1.4vh, 18px)' }}>
          {/* Join card — QR, divider, code tiles */}
          <div
            className="flex items-center"
            style={{
              gap: 'clamp(16px, 1.8vw, 34px)',
              padding: 'clamp(16px, 1.6vw, 30px) clamp(20px, 2.2vw, 40px)',
              borderRadius: 22,
              background: `${CREAM}0.03)`,
              border: `1px solid ${CREAM}0.08)`,
            }}
          >
            <div className="flex flex-col items-center gap-2.5">
              <div className="skeleton-pulse" style={{ width: qr, height: qr, borderRadius: 12, background: `${CREAM}0.10)` }} />
              <div className="skeleton-pulse rounded-full" style={{ width: 76, height: 9, background: `${CREAM}0.07)` }} />
            </div>

            <div style={{ width: 1, alignSelf: 'stretch', background: `${CREAM}0.14)` }} />

            <div className="flex flex-col items-start" style={{ gap: 14 }}>
              <div className="skeleton-pulse rounded-full" style={{ width: 120, height: 9, background: `${CREAM}0.07)` }} />
              <div className="flex" style={{ gap: 'clamp(8px, 0.8vw, 14px)' }}>
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="skeleton-pulse"
                    style={{
                      width: tileW, height: tileH,
                      // Cream, like the real tiles — the code arriving should look like letters
                      // appearing on cards that were already there, not new cards being dealt.
                      background: `${CREAM}0.72)`,
                      borderRadius: 'clamp(8px, 0.7vw, 14px)',
                      boxShadow: '0 16px 30px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Seats */}
          <div className="flex" style={{ gap: 'clamp(10px, 1vw, 18px)' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="skeleton-pulse"
                style={{
                  width: seatW, height: seatH, borderRadius: 18,
                  border: `1.5px dashed ${CREAM}0.14)`,
                  background: `${CREAM}0.015)`,
                  animationDelay: `${i * 0.09}s`,
                }}
              />
            ))}
          </div>

          {/* Waiting bar — inside the distributed body, where the lobby's sits */}
          <div className="flex items-center gap-3 rounded-full"
               style={{ border: '1px solid rgba(255,153,51,0.22)', background: 'rgba(255,153,51,0.05)', padding: '10px 22px' }}>
            <span className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="animate-bounce rounded-full"
                      style={{ width: 6, height: 6, background: 'rgba(255,153,51,0.7)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            <span className="font-[family-name:var(--font-inter)]"
                  style={{ fontSize: 13, color: `${CREAM}0.6)` }}>
              Connecting to the room…
            </span>
          </div>
        </div>

        {/* Attribution — real text, it doesn't depend on the room */}
        <div className="flex justify-center items-center" style={{ paddingBottom: 'clamp(8px, 1vh, 14px)' }}>
          <div className="font-[family-name:var(--font-inter)] uppercase text-center"
               style={{ fontSize: 'clamp(9px, 0.76vw, 11px)', letterSpacing: '0.12em', color: `${CREAM}0.4)` }}>
            An initiative of the Office of Shri Sujeet Kumar
          </div>
        </div>

        {/* Ticker strip — holds the footer's height so the body doesn't shift when it arrives */}
        <div className="flex items-center" style={{ gap: 16, padding: 'clamp(10px, 1.3vh, 16px) 0', borderTop: `1px solid ${CREAM}0.14)` }}>
          <div className="skeleton-pulse rounded-full" style={{ width: 92, height: 9, background: 'rgba(255,153,51,0.28)', flexShrink: 0 }} />
          <div className="skeleton-pulse rounded-full" style={{ flex: 1, height: 10, background: `${CREAM}0.07)` }} />
          <div className="skeleton-pulse rounded-full" style={{ width: 168, height: 9, background: `${CREAM}0.07)`, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
