'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import { getLobbyMusic } from '@/lib/music-manager';
import EmoteOverlay from '@/components/projector/EmoteOverlay';
import HostOverlay from '@/components/projector/HostOverlay';
import MuteButton from '@/components/ui/MuteButton';
import ProjectorLobby from '@/components/projector/ProjectorLobby';
import ProjectorChallengeReveal from '@/components/projector/ProjectorChallengeReveal';
import ProjectorSubmission from '@/components/projector/ProjectorSubmission';
import ProjectorReveal from '@/components/projector/ProjectorReveal';
import ProjectorJudging from '@/components/projector/ProjectorJudging';
import ProjectorWinner from '@/components/projector/ProjectorWinner';
import ProjectorBetweenRounds from '@/components/projector/ProjectorBetweenRounds';
import ProjectorGameOver from '@/components/projector/ProjectorGameOver';
import MobileHostContent from '@/components/projector/MobileHostContent';
import SkeletonCard from '@/components/ui/SkeletonCard';
import type { GameRoom } from '@/types/game';

interface Props { code: string; hostId?: string }

const PHASE_BG: Record<string, string> = {
  lobby: '#0d1b35',
  'challenge-reveal': '#1a0d2e',
  submission: '#0d1b35',
  reveal: '#1a2a0d',
  judging: '#0d1b35',
  winner: '#2a1a00',
  'between-rounds': '#0d1b35',
  'game-over': '#1a0d00',
};

// Full-screen interstitials before key phases
const PHASE_TRANSITIONS: Partial<Record<string, string>> = {
  'challenge-reveal': 'GET READY',
  reveal: "LET'S SEE WHAT\nYOU PLAYED",
  winner: 'AND THE\nWINNER IS...',
};

type OverlayInfo = { text: string; color: string; initial: { y?: number; x?: number; scale?: number } };

function getOverlay(phase: string, round: number): OverlayInfo | null {
  if (phase === 'challenge-reveal') return { text: `ROUND ${round}`, color: '#FF9933', initial: { y: -80, scale: 1.3 } };
  if (phase === 'submission') return { text: 'ALL IN', color: '#FF9933', initial: { y: 80, scale: 1 } };
  if (phase === 'reveal') return { text: "TIME'S UP", color: '#ef4444', initial: { x: 120, scale: 1 } };
  return null;
}

export default function ProjectorView({ code, hostId: hostIdProp }: Props) {
  const router = useRouter();
  // Resolved hostId — read from prop on first load, persisted to sessionStorage,
  // then URL is cleaned so the credential doesn't live in browser history or server logs.
  const [hostId, setHostId] = useState('');
  const isHost = Boolean(hostId);
  // A host on a phone gets a portrait-native control view instead of the 16:9 TV layout.
  const [isMobileHost, setIsMobileHost] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobileHost(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const storageKey = `vikas75_hostId_${code}`;
    if (hostIdProp) {
      // First visit with ?h= param — persist to sessionStorage and strip from URL
      try { sessionStorage.setItem(storageKey, hostIdProp); } catch { /* ignore */ }
      setHostId(hostIdProp);
      router.replace(`/projector/${code}`);
    } else {
      // Subsequent visits (after URL cleaned, or direct nav) — read from sessionStorage
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) setHostId(stored);
      } catch { /* ignore */ }
    }
  }, [code, hostIdProp, router]);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [roomMissing, setRoomMissing] = useState(false);
  const [transitionText, setTransitionText] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const prevPhaseRef = useRef<string | undefined>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the timerEndsAt value we last fired timer-expire for, so stale or duplicate
  // Pusher events with delay ≤ 0 don't call timerExpire() a second time.
  const timerFiredForRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then(async (r) => {
        if (r.status === 404) { setRoomMissing(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d) => { if (d?.room) { setRoom(d.room); setRoomMissing(false); } })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    // Pusher is the real-time channel; this poll is the fallback when it's unavailable (no
    // PUSHER env vars, blocked egress, dropped connection). Poll fast while a round is in
    // motion so phase changes — round ends after everyone submits, and the judge's verdict —
    // reach the big screen within a few seconds instead of stalling for 30s (which looks like
    // "the round won't end" or "stuck on AI deliberating"). Idle phases poll slowly.
    const active = room?.phase === 'submission' || room?.phase === 'reveal'
      || room?.phase === 'judging' || room?.phase === 'winner';
    // Jitter per client so fallback polls don't all land on the same beat under load.
    const base = active ? 3_000 : 30_000;
    const poll = setInterval(() => {
      fetch(`/api/game?code=${code}`)
        .then(async (r) => {
          if (r.status === 404) { setRoomMissing(true); return null; }
          return r.ok ? r.json() : null;
        })
        .then((d) => { if (d?.room) { setRoom(d.room); setRoomMissing(false); } })
        .catch(() => {});
    }, base + Math.random() * (active ? 1_500 : 8_000));
    return () => clearInterval(poll);
  }, [code, room?.phase]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    const onRoomUpdated = (updated: GameRoom) => setRoom(updated);
    const onMusicToggle = (payload: { muted: boolean }) => getLobbyMusic().forceMute(payload.muted);
    channel.bind('game:room-updated', onRoomUpdated);
    channel.bind('music:toggle', onMusicToggle);
    return () => {
      channel.unbind('game:room-updated', onRoomUpdated);
      channel.unbind('music:toggle', onMusicToggle);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  // Phase transition overlays
  useEffect(() => {
    if (!room) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = room.phase;
    if (prev === undefined || prev === room.phase) return;

    // Fade out lobby music when leaving the lobby
    if (prev === 'lobby') {
      getLobbyMusic().stop();
    }

    // Full-screen interstitial (#6). Always clear the previous one first; if the new phase
    // has none, leave it cleared — otherwise a fast transition (e.g. host advances before the
    // 1.5s timer fires) would cancel the pending clear and leave the text stuck on screen.
    const interstitial = PHASE_TRANSITIONS[room.phase];
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (interstitial) {
      setTransitionText(interstitial);
      transitionTimerRef.current = setTimeout(() => setTransitionText(null), 1500);
    } else {
      setTransitionText(null);
    }

    // Brief text overlay (#8). Same rule — clear on every phase change so e.g. "TIME'S UP"
    // never lingers over the reveal/winner results.
    const ov = getOverlay(room.phase, room.round);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    if (ov) {
      setOverlay(ov);
      overlayTimerRef.current = setTimeout(() => setOverlay(null), 1200);
    } else {
      setOverlay(null);
    }

    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [room?.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const timerExpire = useCallback(() => {
    fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'timer-expire', code }),
    }).catch(() => {});
  }, [code]);

  useEffect(() => {
    if (!room?.timerEndsAt || room.phase !== 'submission') {
      // Phase left submission — reset so the next round's timer fires fresh.
      timerFiredForRef.current = 0;
      return;
    }
    // Guard: already fired for this exact timer period (prevents duplicate Pusher events
    // or a stale event with delay ≤ 0 from calling timerExpire a second time).
    if (timerFiredForRef.current === room.timerEndsAt) return;
    const delay = room.timerEndsAt - Date.now();
    if (delay <= 0) {
      timerFiredForRef.current = room.timerEndsAt;
      timerExpire();
      return;
    }
    const t = setTimeout(() => {
      timerFiredForRef.current = room.timerEndsAt!;
      timerExpire();
    }, delay);
    return () => clearTimeout(t);
  }, [room?.timerEndsAt, room?.phase, timerExpire]);

  // Watchdog: a verdict normally lands within the judge's 8s timeout. If we're still in the
  // judging phase well past that, the server-side judge likely never ran (e.g. a serverless
  // after() callback that was dropped) — re-kick it. The action is idempotent and awaited
  // server-side, so it resolves the round even if the original scheduling mechanism failed.
  useEffect(() => {
    if (room?.phase !== 'judging') return;
    const kick = () => {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick-judge', code }),
      }).catch(() => {});
    };
    const iv = setInterval(kick, 12_000);
    return () => clearInterval(iv);
  }, [room?.phase, code]);

  function renderPhase() {
    if (!room) return null;
    switch (room.phase) {
      case 'lobby':            return <ProjectorLobby room={room} />;
      case 'challenge-reveal': return <ProjectorChallengeReveal room={room} />;
      case 'submission':       return <ProjectorSubmission room={room} />;
      case 'reveal':           return <ProjectorReveal room={room} />;
      case 'judging':          return <ProjectorJudging />;
      case 'winner':           return <ProjectorWinner room={room} />;
      case 'between-rounds':   return <ProjectorBetweenRounds room={room} />;
      case 'game-over':        return <ProjectorGameOver room={room} />;
      default:                 return null;
    }
  }

  if (roomMissing) {
    return (
      <div className="w-screen h-screen bg-[#0d1b35] flex flex-col items-center justify-center gap-6">
        <p className="text-6xl">🏁</p>
        <h1 className="font-[family-name:var(--font-bebas)] text-white text-5xl tracking-widest text-center">
          Room Closed
        </h1>
        <p className="text-white/50 text-xl text-center font-[family-name:var(--font-inter)] max-w-xl">
          This game has ended or the room was shut down after inactivity.
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="w-screen h-screen bg-[#0d1b35] flex items-center justify-center p-12">
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="w-screen overflow-hidden relative"
      // 100dvh (not 100vh) so on iOS Safari the content/host bar isn't hidden behind the toolbar.
      style={{ height: '100dvh' }}
      animate={{ backgroundColor: PHASE_BG[room.phase] ?? '#0d1b35' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Portrait orientation guard — only for a pure projector/TV display. A host who opened
          this on their phone (?h=) must not be hard-blocked: their control bar works in
          portrait, so they can still run the game from a phone. */}
      {!isHost && (
        <div className="portrait-lock">
          <span style={{ fontSize: 64 }}>🔄</span>
          <p className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-wide text-center px-8">
            Please rotate your screen to landscape
          </p>
        </div>
      )}

      {isHost && isMobileHost ? (
        // Host running the game from a phone — portrait-native game state; controls come from
        // <HostOverlay> (the fixed bar below). The TV phase layouts are 16:9-first and cramped here.
        <div className="w-full overflow-y-auto" style={{ height: '100dvh' }}>
          <MobileHostContent room={room} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={room.phase}
            className="w-full h-full"
            style={{ paddingBottom: isHost ? 72 : 0, boxSizing: 'border-box' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {renderPhase()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Full-screen interstitial — "GET READY", "LET'S SEE WHAT YOU PLAYED", etc. */}
      <AnimatePresence>
        {transitionText && (
          <motion.div
            key={`interstitial-${transitionText}`}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(13, 27, 53, 0.88)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.p
              className="font-[family-name:var(--font-bebas)] text-white text-center whitespace-pre-line"
              style={{ fontSize: 'min(15vw, 120px)', lineHeight: 1.1, textShadow: '0 4px 40px rgba(0,0,0,0.8)' }}
              initial={{ scale: 1.4, y: -40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {transitionText}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brief text overlay — "ROUND 1", "ALL IN", "TIME'S UP" */}
      <AnimatePresence>
        {overlay && !transitionText && (
          <motion.div
            key={`overlay-${overlay.text}`}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.p
              className="font-[family-name:var(--font-bebas)] tracking-widest text-center"
              style={{
                fontSize: 'min(20vw, 160px)',
                color: overlay.color,
                textShadow: '0 6px 30px rgba(0,0,0,0.7)',
                lineHeight: 1,
              }}
              initial={{ ...overlay.initial, opacity: 0 }}
              animate={{ y: 0, x: 0, scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {overlay.text}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <EmoteOverlay code={code} />
      {/* Mobile host already has a music toggle in the control bar — hide the floating one
          so it doesn't collide with the room-code header. */}
      {!(isHost && isMobileHost) && <MuteButton />}
      {isHost && hostId && <HostOverlay room={room} code={code} hostId={hostId} />}
    </motion.div>
  );
}
