'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from '@/lib/avatars';
import { buildShareCard } from '@/lib/share-card';
import type { GameRoom } from '@/types/game';

interface Props {
  room: GameRoom;
  playerId: string;
  onExit: () => void;
}

const SAFFRON = '#FF9933';
const GOLD = '#FFD700';
const CREAM = 'rgba(250,248,240,';

/* The phone's end-of-game screen: final podium, your own placement, and the share card.
 *
 * Ranking mirrors ProjectorGameOver exactly (roundsWon → score → id) — if the phone and the
 * big screen ever disagreed on the champion, the room would notice immediately.
 *
 * Sharing: the card is drawn on a canvas client-side (share-card.ts) and handed to the Web
 * Share API — on Android/TWA that opens straight into WhatsApp with the image attached. Where
 * file sharing isn't available (desktop browsers, iOS Safari sans files), a preview overlay
 * shows the PNG for long-press-to-share plus a download link, so no environment dead-ends. */
export default function PlayerGameOver({ room, playerId, onExit }: Props) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  // Memoised as one unit: the share callback depends on all of it, and recomputing a fresh
  // array each render would defeat its memoisation.
  const { players, champion, hasLead, champions, tied, myPlace, iAmChampion } = useMemo(() => {
    const sorted = Object.values(room.players).sort(
      (a, b) => (b.roundsWon ?? 0) - (a.roundsWon ?? 0) || b.score - a.score || a.id.localeCompare(b.id),
    );
    const top = sorted[0];
    const lead = !!top && ((top.roundsWon ?? 0) > 0 || top.score > 0);
    // A dead heat is joint champions on the projector — say the same thing here rather than
    // crowning whoever won the id tiebreak.
    const tiedTop = top
      ? sorted.filter((p) => (p.roundsWon ?? 0) === (top.roundsWon ?? 0) && p.score === top.score)
      : [];
    return {
      players: sorted,
      champion: top,
      hasLead: lead,
      champions: tiedTop,
      tied: lead && tiedTop.length > 1,
      myPlace: sorted.findIndex((p) => p.id === playerId) + 1,
      iAmChampion: tiedTop.some((p) => p.id === playerId),
    };
  }, [room.players, playerId]);

  const share = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildShareCard({
        code: room.code,
        totalRounds: room.totalRounds,
        standings: players.map((p) => ({
          name: p.name,
          avatarId: p.avatarId,
          score: p.score,
          roundsWon: p.roundsWon ?? 0,
          isMe: p.id === playerId,
        })),
        origin: window.location.origin,
      });
      const file = new File([blob], 'vikas75-result.png', { type: 'image/png' });
      const text = iAmChampion
        ? `I ${tied ? 'tied for the win' : 'won'} at Vikas 75 — the sarkari scheme card game! 🎴 Play: ${window.location.origin}`
        : myPlace > 0
          ? `I finished #${myPlace} in Vikas 75 — the sarkari scheme card game! 🎴 Play: ${window.location.origin}`
          : `We just played Vikas 75 — the sarkari scheme card game! 🎴 Play: ${window.location.origin}`;
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: 'Vikas 75' });
          return;
        } catch (err) {
          // Backing out of the share sheet is a choice, not a failure — no fallback modal.
          if ((err as { name?: string })?.name === 'AbortError') return;
        }
      }
      // No file sharing here (desktop, some iOS): show the PNG for long-press / download.
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      toast.error("Couldn't create the share image — try again");
    } finally {
      setBusy(false);
    }
  }, [busy, players, playerId, myPlace, iAmChampion, tied, room.code, room.totalRounds]);

  const closePreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] px-4 py-6 animate-fade-in">
      <p className="text-4xl">🎉</p>
      <p className="text-white font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-center">
        Khel Khatam!
      </p>

      {hasLead && (
        <div className="flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: 'rgba(255,215,0,0.5)', background: 'rgba(255,215,0,0.08)' }}>
          <div className="rounded-xl overflow-hidden shrink-0">
            <Avatar id={champion.avatarId} size={44} className="rounded-xl" />
          </div>
          <div className="text-left">
            <p className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase" style={{ color: GOLD, letterSpacing: '0.2em' }}>
              {tied ? 'Joint champions' : 'Champion'}
            </p>
            <p className="font-[family-name:var(--font-bebas)] text-2xl tracking-wide leading-none" style={{ color: GOLD }}>
              {tied ? champions.map((p) => p.name).join(' & ') : champion.name}
            </p>
          </div>
          <p className="font-[family-name:var(--font-inter)] text-xs font-semibold ml-2" style={{ color: `${CREAM}0.6)` }}>
            {champion.roundsWon ?? 0} 🏆 · {champion.score} pts
          </p>
        </div>
      )}

      {myPlace > 0 && (
        <p className="font-[family-name:var(--font-inter)] text-sm font-semibold" style={{ color: iAmChampion ? GOLD : `${CREAM}0.65)` }}>
          {iAmChampion
            ? (tied ? '🏆 Joint champion!' : '🏆 You take the game!')
            : `You finished #${myPlace} of ${players.length}`}
        </p>
      )}

      <button
        onClick={share}
        disabled={busy}
        className="mt-2 px-8 h-14 font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-60"
        style={{ background: 'rgba(255,153,51,0.14)', border: `2px solid ${SAFFRON}`, color: SAFFRON }}
      >
        {busy ? 'Making your card…' : 'Share result 📤'}
      </button>
      <button
        onClick={onExit}
        className="px-8 h-14 bg-[#FF9933] hover:bg-[#e8872a] text-[#08070f] font-[family-name:var(--font-bebas)] text-2xl tracking-widest rounded-xl transition-all active:scale-95"
      >
        Play Again →
      </button>
      <a
        href="/explore"
        className="flex items-center gap-1.5 font-[family-name:var(--font-inter)] text-xs font-medium tracking-wide transition-colors"
        style={{ color: 'rgba(250,248,240,0.38)', textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,153,51,0.8)'}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,248,240,0.38)'}
      >
        Explore all 75 schemes
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5H8M5.5 2.5L8 5L5.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-6"
          style={{ background: 'rgba(8,7,15,0.92)' }}
          role="dialog"
          aria-label="Your shareable result card"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL, next/image can't optimise it */}
          <img src={previewUrl} alt="Vikas 75 result card" className="max-h-[70vh] w-auto rounded-xl border border-white/15" />
          <p className="font-[family-name:var(--font-inter)] text-xs text-center" style={{ color: `${CREAM}0.6)` }}>
            Long-press the image to share or save it
          </p>
          <div className="flex items-center gap-3">
            <a
              href={previewUrl}
              download="vikas75-result.png"
              className="px-5 h-11 flex items-center font-[family-name:var(--font-bebas)] text-lg tracking-widest rounded-lg"
              style={{ background: SAFFRON, color: '#08070f' }}
            >
              Download
            </a>
            <button
              onClick={closePreview}
              className="px-5 h-11 font-[family-name:var(--font-bebas)] text-lg tracking-widest rounded-lg border"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
