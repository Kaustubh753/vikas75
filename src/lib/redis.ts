import type { GameRoom } from '@/types/game';

// In-memory store used when Upstash env vars are absent (local dev without Redis)
const devStore = new Map<string, { value: GameRoom; expiresAt: number }>();

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedis() {
  // Lazily import so the module doesn't crash when env vars are missing
  const { Redis } = require('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 60 * 60 * 6; // 6 hours in seconds

export async function getRoom(code: string): Promise<GameRoom | null> {
  if (!isRedisConfigured()) {
    const entry = devStore.get(`${ROOM_PREFIX}${code}`);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.value;
  }
  return (getRedis().get(`${ROOM_PREFIX}${code}`) as Promise<GameRoom | null>);
}

export async function setRoom(room: GameRoom): Promise<void> {
  if (!isRedisConfigured()) {
    devStore.set(`${ROOM_PREFIX}${room.code}`, {
      value: room,
      expiresAt: Date.now() + ROOM_TTL * 1000,
    });
    return;
  }
  await getRedis().set(`${ROOM_PREFIX}${room.code}`, room, { ex: ROOM_TTL });
}

export async function deleteRoom(code: string): Promise<void> {
  if (!isRedisConfigured()) {
    devStore.delete(`${ROOM_PREFIX}${code}`);
    return;
  }
  await getRedis().del(`${ROOM_PREFIX}${code}`);
}

export async function listActiveRooms(): Promise<string[]> {
  if (!isRedisConfigured()) {
    const now = Date.now();
    return [...devStore.entries()]
      .filter(([, v]) => v.expiresAt > now)
      .map(([k]) => k.replace(ROOM_PREFIX, ''));
  }
  const keys: string[] = await getRedis().keys(`${ROOM_PREFIX}*`);
  return keys.map((k) => k.replace(ROOM_PREFIX, ''));
}
