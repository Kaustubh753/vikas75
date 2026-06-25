import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { listActiveRooms, getRoom, checkRateLimit } from '@/lib/redis';
import type { GameRoom } from '@/types/game';

/** Strip room-level credentials (hostId, the playerId→token secret map) AND every player's
 *  private hand before returning rooms to the admin. The admin dashboard needs none of these,
 *  and leaking tokens/hostId would let anyone holding them impersonate a player or the host —
 *  the same invariant the game route enforces via stripSecrets/scrubRoomFor. */
function scrubRoom(room: GameRoom) {
  const { hostId: _hostId, tokens: _tokens, ...rest } = room;
  void _hostId; void _tokens;
  const players = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => {
      const { hand: _hand, ...pRest } = p;
      return [id, pRest];
    })
  );
  return { ...rest, players };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  // Pad to same length to avoid length-based timing leak
  const maxLen = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(maxLen);
  const bufB = Buffer.alloc(maxLen);
  bufA.write(a);
  bufB.write(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkAuth(req: NextRequest): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  // If credentials not configured, deny all access
  if (!expectedUser || !expectedPass) return false;

  const auth = req.headers.get('authorization') ?? '';
  const [, encoded] = auth.split(' ');
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return false;
  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  // Evaluate BOTH comparisons before combining — prevents timing attacks via && short-circuit
  const userMatch = timingSafeStringEqual(user, expectedUser);
  const passMatch = timingSafeStringEqual(pass, expectedPass);
  return userMatch && passMatch;
}

export async function GET(req: NextRequest) {
  // Rate limit: 10 attempts per IP per 15 minutes — brute-force protection
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? 'unknown';
  if (!(await checkRateLimit(`ratelimit:admin:${ip}`, 10, 900))) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'WWW-Authenticate': 'Basic realm="Vikas75 Admin"' } }
    );
  }
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Vikas75 Admin"' } }
    );
  }
  const action = req.nextUrl.searchParams.get('action');
  if (action === 'rooms') {
    const codes = await listActiveRooms();
    const rooms = await Promise.all(codes.map((c) => getRoom(c)));
    // Scrub player hands — card data is private and admins don't need it
    return NextResponse.json({ rooms: rooms.filter(Boolean).map((r) => scrubRoom(r!)) });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
