'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getPusherClient, getRoomChannel } from '@/lib/pusher-client';
import EmoteOverlay from '@/components/projector/EmoteOverlay';
import MuteButton from '@/components/ui/MuteButton';
import ProjectorLobby from '@/components/projector/ProjectorLobby';
import ProjectorChallengeReveal from '@/components/projector/ProjectorChallengeReveal';
import ProjectorSubmission from '@/components/projector/ProjectorSubmission';
import ProjectorReveal from '@/components/projector/ProjectorReveal';
import ProjectorJudging from '@/components/projector/ProjectorJudging';
import ProjectorWinner from '@/components/projector/ProjectorWinner';
import ProjectorBetweenRounds from '@/components/projector/ProjectorBetweenRounds';
import ProjectorGameOver from '@/components/projector/ProjectorGameOver';
import SkeletonCard from '@/components/ui/SkeletonCard';
import type { GameRoom } from '@/types/game';

interface Props { code: string }

const PHASE_BG: Record<string, string> = {
  lobby: '#0d1b35',
  'challenge-reveal': '#1a0d2e',
  submission: '#0d1b35',
  reveal: '#1a2a0d',
  judging: '#0d1b2e',
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

export default function ProjectorView({ code }: Props) {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [transitionText, setTransitionText] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const prevPhaseRef = useRef<string | undefined>(undefined);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/game?code=${code}`)
      .then((r) => r.json())
      .then((d) => { if (d.room) setRoom(d.room); })
      .catch(() => {});
  }, [code]);

  useEffect(() => {
    const poll = setInterval(() => {
      fetch(`/api/game?code=${code}`)
        .then((r) => r.json())
        .then((d) => { if (d.room) setRoom(d.room); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(poll);
  }, [code]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(getRoomChannel(code));
    const onRoomUpdated = (updated: GameRoom) => setRoom(updated);
    channel.bind('game:room-updated', onRoomUpdated);
    return () => {
      channel.unbind('game:room-updated', onRoomUpdated);
      pusher.unsubscribe(getRoomChannel(code));
    };
  }, [code]);

  // Phase transition overlays
  useEffect(() => {
    if (!room) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = room.phase;
    if (prev === undefined || prev === room.phase) return;

    // Full-screen interstitial (#6)
    const interstitial = PHASE_TRANSITIONS[room.phase];
    if (interstitial) {
      setTransitionText(interstitial);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => setTransitionText(null), 1500);
    }

    // Brief text overlay (#8)
    const ov = getOverlay(room.phase, room.round);
    if (ov) {
      setOverlay(ov);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = setTimeout(() => setOverlay(null), 1200);
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
    if (!room?.timerEndsAt || room.phase !== 'submission') return;
    const delay = room.timerEndsAt - Date.now();
    if (delay <= 0) { timerExpire(); return; }
    const t = setTimeout(timerExpire, delay);
    return () => clearTimeout(t);
  }, [room?.timerEndsAt, room?.phase, timerExpire]);

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
      className="w-screen h-screen overflow-hidden relative"
      animate={{ backgroundColor: PHASE_BG[room.phase] ?? '#0d1b35' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Portrait orientation guard */}
      <div className="portrait-lock">
        <span style={{ fontSize: 64 }}>🔄</span>
        <p className="font-[family-name:var(--font-bebas)] text-white text-3xl tracking-wide text-center px-8">
          Please rotate your screen to landscape
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={room.phase}
          className="w-full h-full"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {renderPhase()}
        </motion.div>
      </AnimatePresence>

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
      <MuteButton />
    </motion.div>
  );
}
