import type { Redis as RedisType } from '@upstash/redis';
import type { GameRoom } from '@/types/game';

// In-memory store used when Upstash env vars are absent (local dev without Redis)
const devStore = new Map<string, { value: GameRoom; expiresAt: number }>();
const devRateStore = new Map<string, { count: number; expiresAt: number }>();
const devLockStore = new Map<string, number>(); // key → expiresAt timestamp

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Warn once at request time (not during static build) if running in production without Redis
let _warnedNoRedis = false;
function warnIfMissingRedis() {
  if (!_warnedNoRedis && process.env.NODE_ENV === 'production' && !isRedisConfigured()) {
    _warnedNoRedis = true;
    console.error('[redis] WARNING: Running in production without Upstash Redis. Room state will not persist across serverless instances.');
  }
}

let redisInstance: RedisType | null = null;

function createRedis(): RedisType {
  // Dynamic require keeps the module out of the bundle when Redis is unconfigured (local dev).
  // `import type` above gives us the static type without a runtime import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('@upstash/redis') as { Redis: new (opts: { url: string; token: string }) => RedisType };
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

function getRedis(): RedisType {
  if (!redisInstance) redisInstance = createRedis();
  return redisInstance;
}

const ROOM_PREFIX = 'room:';
const ROOM_TTL = 60 * 60 * 24; // 24 hours in seconds

export async function getRoom(code: string): Promise<GameRoom | null> {
  warnIfMissingRedis();
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
  // Bump the monotonic revision on every write. Writes are serialized per room by
  // withRoomLock, so this never races; clients use it to discard a stale snapshot (e.g. a
  // slow poll resolving after a newer Pusher event) instead of reverting the phase.
  room.rev = (room.rev ?? 0) + 1;
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

// General-purpose Redis rate limiter. Returns true if within limit, false if exceeded.
// Uses Redis INCR in production; in-memory fallback in dev (not shared across instances).
export async function checkRateLimit(key: string, max: number, windowSec: number): Promise<boolean> {
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
    return true; // fail open — don't block on Redis errors
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
    const redis = getRedis();
    const codes: string[] = [];
    let cursor = 0;
    do {
      // SCAN is non-blocking unlike KEYS * — safe for large keyspaces
      const [nextCursor, keys] = await redis.scan(cursor, { match: `${ROOM_PREFIX}*`, count: 100 });
      cursor = Number(nextCursor);
      for (const k of keys as string[]) {
        codes.push(k.replace(ROOM_PREFIX, ''));
      }
    } while (cursor !== 0);
    return codes;
  } catch {
    return [];
  }
}

/**
 * Release a distributed lock acquired with acquireLock.
 * Safe to call even if the lock has already expired.
 */
export async function releaseLock(key: string): Promise<void> {
  if (!isRedisConfigured()) {
    devLockStore.delete(key);
    return;
  }
  try {
    await getRedis().del(key);
  } catch {
    // Best-effort — lock will auto-expire anyway
  }
}

/**
 * Acquire a distributed lock using Redis SET NX EX.
 * Returns true if the lock was acquired, false if already held.
 * The lock auto-expires after ttlSec seconds — no need to release explicitly.
 */
export async function acquireLock(key: string, ttlSec: number): Promise<boolean> {
  if (!isRedisConfigured()) {
    const now = Date.now();
    const expiresAt = devLockStore.get(key) ?? 0;
    if (expiresAt > now) return false; // lock already held
    devLockStore.set(key, now + ttlSec * 1000);
    return true;
  }
  try {
    // SET key 1 NX EX ttl — returns "OK" on success, null if key already exists
    const result = await getRedis().set(key, '1', { nx: true, ex: ttlSec });
    return result !== null;
  } catch {
    return true; // fail open — don't block judging on Redis errors
  }
}
