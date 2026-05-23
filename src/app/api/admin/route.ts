import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { listActiveRooms, getRoom } from '@/lib/redis';
import type { GameRoom } from '@/types/game';

/** Strip player hands before returning rooms to the admin — hands are private card data. */
function scrubRoom(room: GameRoom): Omit<GameRoom, 'players'> & { players: Record<string, Omit<GameRoom['players'][string], 'hand'>> } {
  const players = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => {
      const { hand: _hand, ...rest } = p;
      return [id, rest];
    })
  );
  return { ...room, players };
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
