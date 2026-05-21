import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getRoom, setRoom } from '@/lib/redis';
import { broadcastRoom, pusherServer, getRoomChannel } from '@/lib/pusher';
import {
  createRoom,
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
import type { Submission, GameMode, AvatarId, EmoteEvent, ChatMessage, GameRoom } from '@/types/game';

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
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/[<>&"']/g, '').slice(0, 24);
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
        const room = createRoom(hostId, safeName, totalRounds, timerDuration, gameMode);
        await setRoom(room);
        return NextResponse.json({ room });
      }

      case 'join': {
        const { code, playerId, playerName, avatarId } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId;
        };
        const ip = getIp(req);
        if (!rateLimit(`join:${ip}`, 15, 60_000)) {
          return NextResponse.json({ error: 'Too many requests — slow down' }, { status: 429 });
        }
        const safeName = sanitizeName(playerName);
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!playerId || typeof playerId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found — check your code' }, { status: 404 });
        // Idempotent rejoin — always allowed even during submission phase
        if (room.players[playerId]) {
          return NextResponse.json({ room });
        }
        if (room.phase === 'submission') {
          return NextResponse.json({ error: 'Round in progress — join after this round ends' }, { status: 400 });
        }
        const updated = addPlayer(room, playerId, safeName, avatarId ?? 'a1');
        await setRoom(updated);
        await broadcastRoom(updated);
        return NextResponse.json({ room: updated });
      }

      case 'advance': {
        const { code, hostId } = body;
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (hostId && room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        const updated = advancePhase(room);
        await setRoom(updated);
        await broadcastRoom(updated);
        if (updated.phase === 'judging') {
          after(() => triggerJudge(code).catch(() => {}));
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
        const updated = updateSettings(room, { totalRounds, timerDuration, gameMode });
        await setRoom(updated);
        await broadcastRoom(updated);
        return NextResponse.json({ room: updated });
      }

      case 'submit': {
        const { code, submission } = body as { code: string; submission: Submission };
        const room = await getRoom(code);
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (room.phase !== 'submission') {
          return NextResponse.json({ error: 'Not in submission phase' }, { status: 400 });
        }
        // Idempotent — double submission is a no-op
        if (room.submissions[submission.playerId]) {
          return NextResponse.json({ ok: true });
        }
        // Validate submitter is an active player
        if (!room.players[submission.playerId]) {
          return NextResponse.json({ error: 'Player not in this room' }, { status: 403 });
        }
        const updated = addSubmission(room, submission);
        await setRoom(updated);
        // Broadcast happens before auto-advance so clients see the submission tick
        await broadcastRoom(updated);
        if (allPlayersSubmitted(updated)) {
          const revealed = advancePhase(updated);
          await setRoom(revealed);
          await broadcastRoom(revealed);
        }
        return NextResponse.json({ ok: true });
      }

      case 'emote': {
        const { code, emote } = body as { code: string; emote: EmoteEvent };
        if (!rateLimit(`emote:${emote?.playerId ?? 'anon'}`, 20, 60_000)) {
          return NextResponse.json({ ok: true }); // silently drop — client already has cooldown
        }
        await pusherServer.trigger(getRoomChannel(code?.toUpperCase()), 'game:emote', emote);
        return NextResponse.json({ ok: true });
      }

      case 'chat': {
        const { code, message } = body as { code: string; message: Omit<ChatMessage, 'id' | 'sentAt'> & { text: string } };
        if (!rateLimit(`chat:${message?.playerId ?? 'anon'}`, 30, 60_000)) {
          return NextResponse.json({ error: 'Sending too fast' }, { status: 429 });
        }
        const room = await getRoom(code?.toUpperCase());
        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        const rawText = typeof message?.text === 'string' ? message.text.trim() : '';
        const filtered = filterText(rawText);
        if (!filtered) return NextResponse.json({ ok: true });
        const chatMsg: ChatMessage = {
          id: crypto.randomUUID(),
          playerId: message.playerId,
          playerName: sanitizeName(message.playerName),
          avatarId: message.avatarId,
          text: filtered.slice(0, 120),
          sentAt: Date.now(),
        };
        const updated = addMessage(room, chatMsg);
        await setRoom(updated);
        await pusherServer.trigger(getRoomChannel(code?.toUpperCase()), 'game:chat', chatMsg);
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
    const room = await getRoom(code.toUpperCase());
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: 'Storage unavailable — try again in a moment' }, { status: 503 });
  }
}

async function triggerJudge(code: string) {
  const room = await getRoom(code);
  if (!room || room.phase !== 'judging') return;
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

  const verdict = await judgeRound(room.currentChallenge!, submissions);
  const updated = applyVerdict(room, verdict);
  await setRoom(updated);
  await broadcastRoom(updated);
}
