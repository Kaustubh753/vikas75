import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { listActiveRooms, getRoom } from '@/lib/redis';

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

  // Use timing-safe comparison to prevent brute-force timing attacks
  return timingSafeStringEqual(user, expectedUser) && timingSafeStringEqual(pass, expectedPass);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const action = req.nextUrl.searchParams.get('action');
  if (action === 'rooms') {
    const codes = await listActiveRooms();
    const rooms = await Promise.all(codes.map((c) => getRoom(c)));
    return NextResponse.json({ rooms: rooms.filter(Boolean) });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
