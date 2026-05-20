import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getRoom, setRoom } from '@/lib/redis';
import { pusherServer, getRoomChannel } from '@/lib/pusher';
import {
  createRoom,
  addPlayer,
  advancePhase,
  addSubmission,
  applyVerdict,
  allPlayersSubmitted,
} from '@/lib/game-engine';
import { judgeRound } from '@/lib/ai-judge';
import type { Submission } from '@/types/game';

// POST /api/game — multipurpose action endpoint
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case 'create-room': {
      const { hostId, hostName, totalRounds } = body;
      const room = createRoom(hostId, hostName, totalRounds);
      await setRoom(room);
      return NextResponse.json({ room });
    }

    case 'join': {
      const { code, playerId, playerName } = body;
      const room = await getRoom(code);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.phase !== 'lobby' && room.phase !== 'between-rounds') {
        return NextResponse.json({ error: 'Cannot join mid-round' }, { status: 400 });
      }
      if (room.players[playerId]) {
        // Rejoin — just return the existing room (e.g. page refresh)
        return NextResponse.json({ room });
      }
      const updated = addPlayer(room, playerId, playerName);
      await setRoom(updated);
      // game:room-updated carries the full room so clients refresh player lists
      await pusherServer.trigger(getRoomChannel(code), 'game:room-updated', updated);
      return NextResponse.json({ room: updated });
    }

    case 'advance': {
      const { code, hostId } = body;
      const room = await getRoom(code);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.hostId !== hostId) return NextResponse.json({ error: 'Not host' }, { status: 403 });
      const updated = advancePhase(room);
      await setRoom(updated);
      await pusherServer.trigger(getRoomChannel(code), 'game:room-updated', updated);
      // Kick off AI judging after the response is sent
      if (updated.phase === 'judging') {
        after(() => triggerJudge(code).catch(console.error));
      }
      return NextResponse.json({ room: updated });
    }

    case 'submit': {
      const { code, submission } = body as { code: string; submission: Submission };
      const room = await getRoom(code);
      if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      if (room.phase !== 'submission') {
        return NextResponse.json({ error: 'Not in submission phase' }, { status: 400 });
      }
      if (room.submissions[submission.playerId]) {
        // Already submitted — idempotent
        return NextResponse.json({ ok: true });
      }
      const updated = addSubmission(room, submission);
      await setRoom(updated);
      await pusherServer.trigger(getRoomChannel(code), 'game:room-updated', updated);
      // Auto-advance to reveal if everyone submitted
      if (allPlayersSubmitted(updated)) {
        const revealed = advancePhase(updated);
        await setRoom(revealed);
        await pusherServer.trigger(getRoomChannel(code), 'game:room-updated', revealed);
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}

// GET /api/game?code=XXXX
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  const room = await getRoom(code.toUpperCase());
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  return NextResponse.json({ room });
}

async function triggerJudge(code: string) {
  const room = await getRoom(code);
  if (!room || room.phase !== 'judging') return;
  const submissions = Object.values(room.submissions);
  if (submissions.length === 0) return;

  const verdict = await judgeRound(room.currentChallenge!, submissions);
  const updated = applyVerdict(room, verdict);
  await setRoom(updated);
  await pusherServer.trigger(getRoomChannel(code), 'game:room-updated', updated);
}
