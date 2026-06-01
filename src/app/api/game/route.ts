import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getRoom, setRoom, deleteRoom, checkRoomCreationLimit, checkRateLimit, acquireLock, releaseLock } from '@/lib/redis';
import { broadcastRoom, pusherServer, getRoomChannel } from '@/lib/pusher';
import {
  createRoom,
  generateRoomCode,
  addPlayer,
  advancePhase,
  addSubmission,
  applyVerdict,
  allPlayersSubmitted,
  updateSettings,
  addMessage,
} from '@/lib/game-engine';
import { judgeRound } from '@/lib/ai-judge';
import { filterText } from '@/lib/word-filter';
import type { Submission, GameMode, AvatarId, ChatMessage, GameRoom } from '@/types/game';

// Simple in-memory rate limiter — best-effort (not shared across serverless instances)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getIp(req: NextRequest): string {
  // x-real-ip is set by Vercel's edge and cannot be client-spoofed.
  // Fall back to the last (CDN-appended) value in x-forwarded-for rather than the first
  // (which is client-controlled and trivially spoofable).
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  );
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.replace(/[<>]/g, '').trim().slice(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create-room': {
        const { hostId, hostName, totalRounds, timerDuration, gameMode } = body;
        const safeName = sanitizeName(hostName);
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!hostId || typeof hostId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const VALID_GAME_MODES: GameMode[] = ['crowd', 'friends'];
        const safeGameMode: GameMode = VALID_GAME_MODES.includes(gameMode) ? gameMode : 'crowd';

        // Rate limit: max 10 rooms per IP per hour
        const ip = getIp(req);
        if (!(await checkRoomCreationLimit(ip))) {
          return NextResponse.json({ error: 'Too many rooms created. Please try again later.' }, { status: 429 });
        }

        // Generate a unique room code — retry up to 10 times to avoid collisions
        let roomCode: string | null = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = generateRoomCode();
          if (!(await getRoom(candidate))) { roomCode = candidate; break; }
        }
        if (!roomCode) return NextResponse.json({ error: 'Could not generate unique room code — try again' }, { status: 500 });

        const room = createRoom(hostId, safeName, roomCode, totalRounds, timerDuration, safeGameMode);
        await setRoom(room);
        return NextResponse.json({ room });
      }

      case 'join': {
        const { code, playerId, playerName, avatarId } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId;
        };
        if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
        const ip = getIp(req);
        if (!(await checkRateLimit(`ratelimit:join:${ip}`, 15, 60))) {
          return NextResponse.json({ error: 'Too many requests — slow down' }, { status: 429 });
        }
        const safeName = filterText(sanitizeName(playerName));
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!playerId || typeof playerId !== 'string' || playerId.length > 64) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const VALID_AVATAR_IDS: AvatarId[] = ['a1','a2','a3','a4','a5','a6','a7','a8','a9','a10','a11'];
        const safeAvatarId: AvatarId = VALID_AVATAR_IDS.includes(avatarId) ? avatarId : 'a1';
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found — check your code' }, { status: 404 });
        // Idempotent rejoin — always allowed for existing players
        if (room.players[playerId]) {
          return NextResponse.json({ room });
        }
        if (room.phase === 'submission') {
          return NextResponse.json({ error: 'Round in progress — join after this round ends' }, { status: 400 });
        }
        if (room.phase === 'game-over') {
          return NextResponse.json({ error: 'This game has ended — start a new one!' }, { status: 400 });
        }
        const updated = addPlayer(room, playerId, safeName, safeAvatarId);
        await setRoom(updated);
        await broadcastRoom(updated);
        return NextResponse.json({ room: updated });
      }

      case 'advance': {
        const { code, hostId } = body;
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (!hostId || room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        // Require at least 2 players before leaving lobby
        if (room.phase === 'lobby' && Object.keys(room.players).length < 2) {
          return NextResponse.json({ error: 'Need at least 2 players to start.' }, { status: 400 });
        }
        // Block advancing while the AI judge is still deliberating
        if (room.phase === 'judging') {
          return NextResponse.json({ error: 'AI judge is deliberating — please wait.' }, { status: 400 });
        }
        const updated = advancePhase(room);
        await setRoom(updated);
        await broadcastRoom(updated);
        if (updated.phase === 'judging') {
          after(() => triggerJudge(code.toUpperCase()).catch(() => {}));
        }
        return NextResponse.json({ room: updated });
      }

      case 'update-settings': {
        const { code, hostId, totalRounds, timerDuration, gameMode } = body as {
          code: string; hostId: string;
          totalRounds?: number; timerDuration?: number; gameMode?: GameMode;
        };
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        if (room.phase !== 'lobby') return NextResponse.json({ error: 'Can only update settings in lobby' }, { status: 400 });
        const safeRounds = typeof totalRounds === 'number' ? Math.max(1, Math.min(50, Math.round(totalRounds))) : room.totalRounds;
        const safeTimer = typeof timerDuration === 'number' ? Math.max(10, Math.min(300, Math.round(timerDuration))) : room.timerDuration;
        const VALID_MODES: GameMode[] = ['crowd', 'friends'];
        const safeGameMode: GameMode = VALID_MODES.includes(gameMode as GameMode) ? (gameMode as GameMode) : room.gameMode;
        const updated = updateSettings(room, { totalRounds: safeRounds, timerDuration: safeTimer, gameMode: safeGameMode });
        await setRoom(updated);
        await broadcastRoom(updated);
        return NextResponse.json({ room: updated });
      }

      case 'submit': {
        const { code, submission } = body as { code: string; submission: Submission };
        // Input guard — playerId must be a non-empty string
        if (!submission?.playerId || typeof submission.playerId !== 'string') {
          return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
        }
        // Distributed lock — prevents concurrent submissions overwriting each other.
        // Lock is always released in the finally block so validation failures don't block the room.
        const submitLock = `lock:submit:${code?.toUpperCase()}`;
        const lockAcquired = await acquireLock(submitLock, 5);
        if (!lockAcquired) {
          return NextResponse.json({ error: 'Conflict — please try again' }, { status: 409 });
        }
        try {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          if (room.phase !== 'submission') {
            return NextResponse.json({ error: 'Not in submission phase' }, { status: 400 });
          }
          // Idempotent — double submission is a no-op
          if (room.submissions[submission.playerId]) {
            return NextResponse.json({ ok: true });
          }
          // Validate submitter is an active player
          const submittingPlayer = room.players[submission.playerId];
          if (!submittingPlayer) {
            return NextResponse.json({ error: 'Player not in this room' }, { status: 403 });
          }
          // Validate the submitted card is actually in the player's hand — use server-side card data
          const serverCard = submittingPlayer.hand.find((c) => c.id === submission.schemeCard?.id);
          if (!serverCard) {
            return NextResponse.json({ error: 'Card not in your hand' }, { status: 403 });
          }
          // Sanitize and filter explanation
          const safeExplanation = typeof submission.explanation === 'string'
            ? filterText(submission.explanation.trim().slice(0, 200))
            : '';
          if (!safeExplanation) {
            return NextResponse.json({ error: 'Explanation is required' }, { status: 400 });
          }
          // Enforce 25-word limit server-side (mirrors client UI)
          const wordCount = safeExplanation.split(/\s+/).filter(Boolean).length;
          if (wordCount > 25) {
            return NextResponse.json({ error: 'Explanation too long (max 25 words)' }, { status: 400 });
          }
          // Build submission entirely from server state — no client-supplied card data or identity
          const safeSubmission: Submission = {
            playerId: submission.playerId,
            playerName: submittingPlayer.name,
            avatarId: submittingPlayer.avatarId,
            schemeCard: serverCard,            // authoritative server-side card object
            explanation: safeExplanation,
            submittedAt: Date.now(),           // always server-side timestamp — never trust client
          };
          const updated = addSubmission(room, safeSubmission);
          await setRoom(updated);
          // Broadcast happens before auto-advance so clients see the submission tick
          await broadcastRoom(updated);
          if (allPlayersSubmitted(updated)) {
            // Re-read after write to reduce concurrent auto-advance race window
            const fresh = await getRoom(code.toUpperCase());
            if (fresh?.phase === 'submission') {
              const revealed = advancePhase(fresh);
              await setRoom(revealed);
              await broadcastRoom(revealed);
            }
          }
          return NextResponse.json({ ok: true });
        } finally {
          await releaseLock(submitLock);
        }
      }

      case 'timer-expire': {
        const { code } = body;
        if (!code || typeof code !== 'string') return NextResponse.json({ ok: true });
        const upperCode = code.toUpperCase();
        // Distributed lock — prevent multiple concurrent timer-expire calls from double-advancing
        const timerLock = `lock:timer-expire:${upperCode}`;
        const lockAcquired = await acquireLock(timerLock, 10);
        if (!lockAcquired) return NextResponse.json({ ok: true });
        try {
          const room = await getRoom(upperCode);
          if (!room) return NextResponse.json({ ok: true });
          // Idempotent — only act if still in submission and timer has actually elapsed.
          // No hostId required: the phase + elapsed-timer check is the real guard; the
          // distributed lock prevents double-advancing. Any client (player, projector)
          // can fire this once the timer is genuinely up.
          if (room.phase !== 'submission') return NextResponse.json({ ok: true });
          if (!room.timerEndsAt || Date.now() < room.timerEndsAt) return NextResponse.json({ ok: true });
          // Advance to reveal — players who didn't submit are simply skipped
          const revealed = advancePhase(room);
          await setRoom(revealed);
          await broadcastRoom(revealed);
          return NextResponse.json({ ok: true });
        } finally {
          await releaseLock(timerLock);
        }
      }

      case 'emote': {
        const { code, playerId, emote } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId; emote: string;
        };
        // Redis-backed rate limit — works across serverless instances (20 emotes/player/minute)
        if (!(await checkRateLimit(`ratelimit:emote:${playerId ?? 'anon'}`, 20, 60))) {
          return NextResponse.json({ ok: true });
        }
        const VALID_EMOTES = ['masterstroke','aatmanirbhar','vishwaguru','fakir','antinational','56inch'];
        if (!emote || !VALID_EMOTES.includes(emote)) return NextResponse.json({ ok: true });
        const emoteRoom = await getRoom(code?.toUpperCase());
        const emotePlayer = emoteRoom?.players[playerId];
        if (!emotePlayer) return NextResponse.json({ ok: true }); // silently drop unknown senders
        await pusherServer.trigger(getRoomChannel(code!.toUpperCase()), 'emote', {
          playerId,
          playerName: emotePlayer.name,
          avatarId: emotePlayer.avatarId,
          emote,
          timestamp: Date.now(),
        });
        return NextResponse.json({ ok: true });
      }

      case 'chat': {
        const { code, message } = body as { code: string; message: Omit<ChatMessage, 'id' | 'sentAt'> & { text: string } };
        // Redis-backed rate limit — works across serverless instances (30 messages/player/minute)
        if (!(await checkRateLimit(`ratelimit:chat:${message?.playerId ?? 'anon'}`, 30, 60))) {
          return NextResponse.json({ error: 'Sending too fast' }, { status: 429 });
        }
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        // Validate sender is an actual room player
        const chatPlayer = room.players[message?.playerId];
        if (!chatPlayer) return NextResponse.json({ error: 'Player not in room' }, { status: 403 });
        const rawText = typeof message?.text === 'string' ? message.text.trim() : '';
        const filtered = filterText(rawText);
        if (!filtered) return NextResponse.json({ ok: true });
        const chatMsg: ChatMessage = {
          id: crypto.randomUUID(),
          playerId: message.playerId,
          playerName: chatPlayer.name,        // trust server, not client
          avatarId: chatPlayer.avatarId,      // trust server, not client
          text: filtered.slice(0, 120),
          sentAt: Date.now(),
        };
        const updated = addMessage(room, chatMsg);
        await setRoom(updated);
        await pusherServer.trigger(getRoomChannel(code?.toUpperCase()), 'game:chat', chatMsg);
        return NextResponse.json({ ok: true });
      }

      case 'heartbeat': {
        const { code: hbCode, playerId: hbPid } = body as { code: string; playerId: string };
        if (!hbCode || !hbPid) return NextResponse.json({ ok: true });
        const hbRoom = await getRoom(hbCode.toUpperCase());
        if (!hbRoom || !hbRoom.players[hbPid]) return NextResponse.json({ ok: true });

        const prevSeen = hbRoom.players[hbPid].lastSeen ?? 0;
        const now = Date.now();
        hbRoom.players[hbPid].lastSeen = now;

        // Presence: count how many players are active after this update
        const activePlayers = Object.values(hbRoom.players)
          .filter(p => p.lastSeen && now - p.lastSeen < 45_000);

        if (activePlayers.length <= 1) {
          // Last person standing — schedule auto-shutdown 5 min from now.
          // Each subsequent beacon resets the clock, so the room only dies
          // 5 min after the very last beacon from anyone.
          hbRoom.shutdownAt = now + 5 * 60 * 1000;
        } else {
          // Multiple people active — cancel any pending shutdown
          hbRoom.shutdownAt = undefined;
        }

        await setRoom(hbRoom);
        // Broadcast on reconnect (was stale > 45 s) so host/projector updates
        if (now - prevSeen > 45_000) await broadcastRoom(hbRoom);
        return NextResponse.json({ ok: true });
      }

      case 'end-game': {
        const { code: egCode, hostId: egHostId } = body as { code: string; hostId: string };
        if (!egCode || !egHostId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        const egRoom = await getRoom(egCode.toUpperCase());
        if (!egRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (egRoom.hostId !== egHostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        if (egRoom.phase === 'game-over') return NextResponse.json({ room: egRoom });
        const ended = { ...egRoom, phase: 'game-over' as const, shutdownAt: undefined };
        await setRoom(ended);
        await broadcastRoom(ended);
        return NextResponse.json({ room: ended });
      }

      case 'music-toggle': {
        const { code, hostId: musicHostId, muted } = body as { code: string; hostId: string; muted: boolean };
        if (!code || typeof code !== 'string') {
          return NextResponse.json({ error: 'Room code required' }, { status: 400 });
        }
        const musicRoom = await getRoom(code.toUpperCase());
        if (!musicRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (!musicHostId || musicRoom.hostId !== musicHostId) {
          return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        }
        if (!rateLimit(`music-toggle:${musicHostId}`, 10, 60_000)) {
          return NextResponse.json({ ok: true });
        }
        await pusherServer.trigger(getRoomChannel(code.toUpperCase()), 'music:toggle', { muted: Boolean(muted) });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    if (message.includes('Redis unavailable') || message.includes('Failed to save')) {
      return NextResponse.json({ error: 'Storage unavailable — try again in a moment' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Something went wrong — please try again' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    // Optional: requesting player's own ID — they receive their own hand back; everyone else's is stripped.
    const me = req.nextUrl.searchParams.get('me') ?? '';
    const room = await getRoom(code.toUpperCase());
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // Auto-shutdown: if all players have been gone for 5 minutes, delete the room
    if (room.shutdownAt && Date.now() > room.shutdownAt) {
      await deleteRoom(code.toUpperCase());
      return NextResponse.json({ error: 'Room closed — all players disconnected' }, { status: 404 });
    }

    // Return the requesting player's own hand; strip everyone else's (hands are private).
    const scrubbed = {
      ...room,
      players: Object.fromEntries(
        Object.entries(room.players).map(([id, p]) => [id, { ...p, hand: id === me ? p.hand : [] }])
      ),
    };
    return NextResponse.json({ room: scrubbed });
  } catch {
    return NextResponse.json({ error: 'Storage unavailable — try again in a moment' }, { status: 503 });
  }
}

async function triggerJudge(code: string) {
  // Distributed lock — prevent double-judging if after() fires more than once
  const lockKey = `lock:judging:${code}`;
  const acquired = await acquireLock(lockKey, 60);
  if (!acquired) return; // Another instance already handling this round

  const room = await getRoom(code);
  if (!room || room.phase !== 'judging') return;
  if (!room.currentChallenge) {
    console.error('[triggerJudge] currentChallenge is null in judging phase — skipping');
    return;
  }
  const submissions = Object.values(room.submissions);

  // No submissions — skip to next phase without a verdict
  if (submissions.length === 0) {
    const next: GameRoom = {
      ...room,
      phase: room.round >= room.totalRounds ? 'game-over' : 'between-rounds',
    };
    await setRoom(next);
    await broadcastRoom(next);
    return;
  }

  const verdict = await judgeRound(room.currentChallenge, submissions);

  // Re-read room after Claude responds — judging can take several seconds and settings may have changed
  const freshRoom = await getRoom(code);
  if (!freshRoom || freshRoom.phase !== 'judging') return;

  const updated = applyVerdict(freshRoom, verdict);
  await setRoom(updated);
  await broadcastRoom(updated);
}
