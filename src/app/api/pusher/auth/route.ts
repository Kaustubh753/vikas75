import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';
import { getRoom } from '@/lib/redis';

/**
 * Pusher private-channel authorisation endpoint.
 *
 * Pusher sends a POST with form-encoded body:
 *   socket_id=<id>&channel_name=private-game-XXXX
 *
 * We verify:
 *   1. The channel name matches our expected pattern (private-game-XXXX)
 *   2. The room with that code actually exists in Redis
 *
 * This prevents external actors from subscribing to arbitrary channel names
 * and eavesdropping on game events. Sensitive fields (player hands) are also
 * stripped from all broadcasts as a defence-in-depth measure.
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

    // Room exists — sign and return the auth token
    const auth = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(auth);
  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
