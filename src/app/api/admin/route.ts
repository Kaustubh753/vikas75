import { NextRequest, NextResponse } from 'next/server';
import { listActiveRooms, getRoom } from '@/lib/redis';

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const [, encoded] = auth.split(' ');
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');
  return user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD;
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
