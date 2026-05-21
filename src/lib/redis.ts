import type { GameRoom } from '@/types/game';

// In-memory store used when Upstash env vars are absent (local dev without Redis)
const devStore = new Map<string, { value: GameRoom; expiresAt: number }>();
const devRateStore = new Map<string, { count: number; expiresAt: number }>();

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let redisInstance: ReturnType<typeof createRedis> | null = null;

function createRedis() {
  const { Redis } = require('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getRedis() {
  if (!redisInstance) redisInstance = createRedis();
  return redisInstance;
}

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 60 * 60 * 24; // 24 hours in seconds

export async function getRoom(code: string): Promise<GameRoom | null> {
  if (!isRedisConfigured()) {
    const entry = devStore.get(`${ROOM_PREFIX}${code}`);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.value;
  }
  try {
    return await (getRedis().get(`${ROOM_PREFIX}${code}`) as Promise<GameRoom | null>);
  } catch {
    return null;
  }
}

export async function setRoom(room: GameRoom): Promise<void> {
  if (!isRedisConfigured()) {
    devStore.set(`${ROOM_PREFIX}${room.code}`, {
      value: room,
      expiresAt: Date.now() + ROOM_TTL * 1000,
    });
    return;
  }
  try {
    await getRedis().set(`${ROOM_PREFIX}${room.code}`, room, { ex: ROOM_TTL });
  } catch (err) {
    throw new Error(`Failed to save room state: ${err instanceof Error ? err.message : 'Redis unavailable'}`);
  }
}

export async function deleteRoom(code: string): Promise<void> {
  if (!isRedisConfigured()) {
    devStore.delete(`${ROOM_PREFIX}${code}`);
    return;
  }
  try {
    await getRedis().del(`${ROOM_PREFIX}${code}`);
  } catch {
    // Best-effort delete — ignore errors
  }
}

// Returns true if the request is within the limit, false if exceeded.
// Uses Redis INCR in production; in-memory fallback in dev.
export async function checkRoomCreationLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:create-room:${ip}`;
  const max = 10;
  const windowSec = 3600; // 1 hour

  if (!isRedisConfigured()) {
    const now = Date.now();
    const entry = devRateStore.get(key);
    if (!entry || entry.expiresAt < now) {
      devRateStore.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  try {
    const redis = getRedis();
    const count: number = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    return count <= max;
  } catch {
    return true; // fail open — don't block room creation on Redis errors
  }
}

export async function listActiveRooms(): Promise<string[]> {
  if (!isRedisConfigured()) {
    const now = Date.now();
    return [...devStore.entries()]
      .filter(([, v]) => v.expiresAt > now)
      .map(([k]) => k.replace(ROOM_PREFIX, ''));
  }
  try {
    const keys: string[] = await getRedis().keys(`${ROOM_PREFIX}*`);
    return keys.map((k: string) => k.replace(ROOM_PREFIX, ''));
  } catch {
    return [];
  }
}
