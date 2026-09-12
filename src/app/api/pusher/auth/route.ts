import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getRoom, checkRateLimit } from '@/lib/redis';
import { getIp } from '@/lib/request-ip';

/**
 * Pusher private-channel authorisation endpoint.
 *
 * Pusher sends a POST with form-encoded body:
 *   socket_id=<id>&channel_name=private-game-XXXX
 *
 * We verify:
 *   1. The caller is within a per-IP budget (below)
 *   2. The channel name matches our expected pattern (private-game-XXXX)
 *   3. The room with that code actually exists in Redis
 *
 * KNOWN AND DELIBERATE: this endpoint does NOT prove the caller is in the room. It cannot — the
 * projector is a legitimate subscriber with no seat and no credential, and `/projector/[code]`
 * without `?h=` is a supported mode (see bug #11). So anyone who can read the room code off the
 * big screen can subscribe to the room's feed. That is mostly acceptable, because the feed
 * carries what the projector is already displaying to the room, and `stripForBroadcast` removes
 * hands, the host credential, the token map, and (before the reveal) every answer.
 *
 * The residual is `game:chat`, which is the one stream NOT on the projector. Closing that
 * properly means moving chat to its own channel that requires a seat token — worth doing, and
 * deliberately not rushed in here.
 *
 * The rate limit is the part that matters most: Pusher bills per connection and caps concurrent
 * connections per plan, so without it one laptop can open authorised sockets until the cap is
 * exhausted and drop every real player to polling for the rest of the event. It also blunts the
 * free "does room XXXX exist?" oracle over the 4-letter code space.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 });
    }

    // Generous for real use — a phone re-subscribes on every reconnect, and a whole venue shares
    // one egress IP — but far below what it takes to exhaust a connection cap.
    if (!(await checkRateLimit(`ratelimit:pusherauth:${getIp(req)}`, 120, 60))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Validate channel format: private-game-XXXX (4 uppercase letters)
    const match = channelName.match(/^private-game-([A-Z]{4})$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 403 });
    }

    const code = match[1];
    const room = await getRoom(code);
    if (!room) {
      // Room doesn't exist — deny subscription
      return NextResponse.json({ error: 'Room not found' }, { status: 403 });
    }

    // Pusher not configured — deny so the client gives up the subscription and falls back
    // to polling, rather than throwing an opaque 500.
    if (!pusherServer) {
      return NextResponse.json({ error: 'Real-time unavailable' }, { status: 503 });
    }

    // Room exists — sign and return the auth token
    const auth = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
