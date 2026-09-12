import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getRoom, setRoom, createRoomIfAbsent, deleteRoom, checkRoomCreationLimit, checkRateLimit, acquireLock, releaseLock } from '@/lib/redis';
import { getIp } from '@/lib/request-ip';
import { broadcastRoom, triggerEvent, getRoomChannel } from '@/lib/pusher';
import {
  createRoom,
  generateRoomCode,
  addPlayer,
  advancePhase,
  addSubmission,
  applyVerdict,
  allPlayersSubmitted,
  updateSettings,
  addMessage,
  removePlayer,
} from '@/lib/game-engine';
import { judgeRound, noWinnerVerdict } from '@/lib/ai-judge';
import { JUDGING_LOCK_TTL_MS } from '@/lib/judge-core';
import { isEmoteId } from '@/lib/emotes';
import { filterText, sanitizeName } from '@/lib/word-filter';
import type { Submission, AvatarId, ChatMessage, GameRoom } from '@/types/game';

// The judge fans out up to three parallel Claude calls under a 22 s deadline (see ai-judge.ts)
// inside after(); that background work runs in this function's lifetime, so the route must
// outlive it. 60 s is within every Vercel plan's ceiling and is far more than any handler needs.
export const maxDuration = 60;

// ── Secret handling ──────────────────────────────────────────────────────────
// hostId and per-player tokens are credentials and must never reach a client other
// than as the freshly-issued token in a join response.

/** Remove the host credential and token map from a room before returning it to a client. */
function stripSecrets(room: GameRoom): Omit<GameRoom, 'hostId' | 'tokens'> {
  const { hostId: _h, tokens: _t, ...rest } = room;
  void _h; void _t;
  return rest;
}

/** Client-facing room for a specific player: secrets removed, and every hand except the
 *  named player's stripped (hands are private). */
/**
 * Blank out other players' answers while the round is still being played.
 *
 * Submissions accumulate in the room as people play, and the whole room object is served by
 * GET and broadcast over Pusher — so during `submission` anyone with devtools could read the
 * scheme and the reasoning of everyone who had already gone, and answer against them. That is
 * a straightforward competitive advantage in a game whose entire scoring is comparative.
 *
 * The KEYS are kept: `ProjectorSubmission` and the lobby list only need to know who has
 * submitted, and `allPlayersSubmitted` runs server-side. Only the content is withheld, and only
 * until `reveal`, which is the phase that exists to show exactly this. A player always sees
 * their own answer back.
 */
function hideUnrevealedSubmissions(room: GameRoom, viewerId: string): GameRoom['submissions'] {
  if (room.phase !== 'submission') return room.submissions;
  return Object.fromEntries(
    Object.entries(room.submissions).map(([id, sub]) => [
      id,
      id === viewerId ? sub : { ...sub, explanation: '', schemeCard: { id: '', name: '', hi: '', desc: '', bullets: [] } },
    ]),
  );
}

function scrubRoomFor(room: GameRoom, playerId: string) {
  return {
    ...stripSecrets(room),
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, { ...p, hand: id === playerId ? p.hand : [] }]),
    ),
    submissions: hideUnrevealedSubmissions(room, playerId),
  };
}

/** A player's action/own-hand read is allowed if no token has been issued for them (legacy
 *  rooms created before tokens existed) or the supplied token matches the issued one. */
function tokenOk(room: GameRoom, playerId: string, token: unknown): boolean {
  // Object.hasOwn, not a truthiness read: `room.tokens?.['toString']` resolves up the prototype
  // chain to a function, and `room.tokens?.['__proto__']` to undefined — the first is a wrong
  // "token exists", the second a wrong "no token, allow".
  const expected = Object.hasOwn(room.tokens ?? {}, playerId) ? room.tokens![playerId] : undefined;
  if (!expected) return true; // legacy / no token issued — allow (transitional)
  return typeof token === 'string' && token === expected;
}

// Ceiling on a single room. Chosen above the ~20 the venue actually seats and well below the
// ~400 at which the room's Redis value would stop being writable at all — high enough that no
// real game meets it, low enough that a loop against a known code cannot brick the room.
const MAX_PLAYERS = 30;

// Real selectable avatars (a0 is the picker's "auto/random" sentinel — never stored).
const VALID_AVATAR_IDS: AvatarId[] = ['a1','a2','a3','a4','a5','a6','a7','a8','a9','a10','a11'];

/** Resolve the avatar to store for a joining/reconnecting player. An explicit, still-free
 *  choice is honoured; otherwise (the "auto" sentinel a0, an invalid id, or a collision with
 *  another player) we hand out a *revolving default* — the next avatar in rotation that no one
 *  else in the room is using — so players get visually distinct avatars instead of everyone
 *  defaulting to the same one. `excludePlayerId` lets a reconnecting seat ignore its own
 *  current avatar when checking for collisions. */
function resolveAvatar(room: GameRoom, requested: unknown, excludePlayerId?: string): AvatarId {
  const used = new Set(
    Object.values(room.players)
      .filter((p) => p.id !== excludePlayerId)
      .map((p) => p.avatarId),
  );
  if (typeof requested === 'string' && VALID_AVATAR_IDS.includes(requested as AvatarId) && !used.has(requested as AvatarId)) {
    return requested as AvatarId;
  }
  const order = Object.keys(room.players).length;
  for (let i = 0; i < VALID_AVATAR_IDS.length; i++) {
    const cand = VALID_AVATAR_IDS[(order + i) % VALID_AVATAR_IDS.length];
    if (!used.has(cand)) return cand;
  }
  // Every avatar is in use (>11 players) — overlap is unavoidable; pick a rotation slot.
  return VALID_AVATAR_IDS[order % VALID_AVATAR_IDS.length];
}

/**
 * A player id is a credential-shaped key we look up in `room.players` and `room.tokens`, so it
 * must never be a prototype key. `room.players['__proto__']` is Object.prototype — truthy — and
 * `room.tokens?.['__proto__']` is undefined, which `tokenOk` reads as "no token issued, allow",
 * so an unauthenticated request could take the seat branch and write to Object.prototype for the
 * life of the serverless instance. Membership is also checked with Object.hasOwn below; this
 * guard is the belt to that pair of braces.
 */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/**
 * ...and the character class alone is not enough: `__proto__`, `constructor` and `toString` are
 * all letters and underscores, so they sail through ID_RE. These are rejected by name. Every
 * lookup also uses Object.hasOwn, so this is defence in depth rather than the only guard — but
 * an id that resolves to something on Object.prototype has no business being a player key.
 */
const RESERVED_IDS = new Set([
  '__proto__', 'constructor', 'prototype', 'toString', 'toLocaleString', 'valueOf',
  'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
  '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
]);
/** Room codes are always four letters. Without this, `code` becomes an arbitrary Redis key. */
const CODE_RE = /^[A-Za-z]{4}$/;

// ── Auto-shutdown ────────────────────────────────────────────────────────────
// Idle-room cleanup, not a disconnection detector. Only a room nobody is playing may be
// reaped: one still in the lobby, or one whose game has finished. A room in any playing
// phase is never scheduled and never deleted, however quiet the heartbeats go — phones lock,
// people watch the projector, and a host can pause a round for a speech. The 24 h Redis TTL
// is the real backstop for anything this leaves behind.
const REAPABLE_PHASES = new Set<GameRoom['phase']>(['lobby', 'game-over']);
function isReapable(phase: GameRoom['phase']): boolean {
  return REAPABLE_PHASES.has(phase);
}
/** A finished game can go soon; a lobby has to outlive the host waiting for latecomers. */
function reapWindowMs(phase: GameRoom['phase']): number {
  return phase === 'lobby' ? 15 * 60 * 1000 : 5 * 60 * 1000;
}

export async function POST(req: NextRequest) {
  try {
    // Parse and shape-check BEFORE destructuring. `await req.json()` throws on malformed JSON,
    // and `const { action } = body` throws on a literal `null` body — both surfacing as a 500,
    // which is a lie about whose fault it is and buries genuine 500s in monitoring.
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { action } = body;

    // Shape-guard the two fields that become Redis keys or object keys, once, here — every
    // handler downstream then gets to assume they are well-formed.
    //
    // `code` must be four letters. Unchecked it is an arbitrary string that `getRoom`,
    // `withRoomLock` and `checkRateLimit` all turn into Redis keys, so a megabyte of `code`, or
    // a fresh one per request, is unbounded unauthenticated key creation on the `timer-expire`
    // path (which has no IP bucket by design). create-room carries no code.
    if ('code' in body && body.code !== undefined && !CODE_RE.test(String(body.code ?? ''))) {
      return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
    }
    // `playerId` is looked up in `room.players` and `room.tokens`. See ID_RE — a prototype key
    // there passes both the membership truthiness test and tokenOk's "no token issued, allow".
    for (const field of ['playerId', 'hostId'] as const) {
      const v = (body as Record<string, unknown>)[field];
      if (v !== undefined && (typeof v !== 'string' || !ID_RE.test(v) || RESERVED_IDS.has(v))) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }
    }

    switch (action) {
      case 'create-room': {
        const { hostId, hostName, totalRounds, timerDuration } = body;
        // filterText as well as sanitizeName — the host's name shows on the projector and in
        // every broadcast exactly like a player's, and player names have always been filtered.
        const safeName = sanitizeName(hostName);  // filters, strips and caps, in that order
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!hostId || typeof hostId !== 'string' || hostId.length > 64) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        // Clamp settings (mirrors update-settings) so a hand-crafted request can't seed a room
        // with NaN/negative/huge values — a bad timerDuration otherwise breaks the timer.
        const safeRounds = typeof totalRounds === 'number' && isFinite(totalRounds)
          ? Math.max(1, Math.min(50, Math.round(totalRounds))) : undefined;
        const safeTimer = typeof timerDuration === 'number' && isFinite(timerDuration)
          ? Math.max(10, Math.min(300, Math.round(timerDuration))) : undefined;

        // Rate limit: max 10 rooms per IP per hour
        const ip = getIp(req);
        if (!(await checkRoomCreationLimit(ip))) {
          return NextResponse.json({ error: 'Too many rooms created. Please try again later.' }, { status: 429 });
        }

        // Claim a unique room code — up to 10 attempts. The claim IS the write
        // (createRoomIfAbsent = SET NX): checking "is this code free?" and then writing as two
        // steps let two hosts drawing the same candidate both see it free, and the second write
        // silently destroyed the first host's room.
        let room: GameRoom | null = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = createRoom(hostId, safeName, generateRoomCode(), safeRounds, safeTimer);
          if (await createRoomIfAbsent(candidate)) { room = candidate; break; }
        }
        if (!room) return NextResponse.json({ error: 'Could not generate unique room code — try again' }, { status: 500 });
        return NextResponse.json({ room: stripSecrets(room) });
      }

      case 'join': {
        const { code, playerId, playerName, avatarId, token: joinToken } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId; token?: string;
        };
        if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
        const ip = getIp(req);
        // Keyed on IP but generous: a whole venue shares one egress IP, so ~20 phones scanning
        // the lobby QR at once (plus flaky-WiFi retries) must not trip the limiter and lock out
        // late joiners. Room *creation* is separately capped at 10/hr/IP for anti-abuse.
        if (!(await checkRateLimit(`ratelimit:join:${ip}`, 60, 60))) {
          return NextResponse.json({ error: 'Too many requests — slow down' }, { status: 429 });
        }
        const safeName = sanitizeName(playerName);  // filters, strips and caps, in that order
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!playerId || typeof playerId !== 'string' || playerId.length > 64) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const res = await withRoomLock(code, async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found — check your code' }, { status: 404 });
          // Idempotent rejoin for an existing seat. `playerId` is NOT a secret — it's in every
          // broadcast/GET room payload — so returning this seat's token + private hand to anyone
          // who posts the id would be full impersonation. Require the caller to prove the seat's
          // token (tokenOk also passes for a legacy seat that never had a token issued). A caller
          // who can't authenticate is rejected here; genuine reconnection with a lost id goes
          // through the stale-seat reclaim path below (fresh id + same name).
          if (Object.hasOwn(room.players, playerId)) {
            if (!tokenOk(room, playerId, joinToken)) {
              return NextResponse.json({ error: 'Not authorized for this seat' }, { status: 403 });
            }
            // Mark present immediately (don't wait up to 20s for the first heartbeat) and
            // cancel any pending auto-shutdown — a returning player means the room is alive.
            const wasStale = !room.players[playerId].lastSeen
              || Date.now() - room.players[playerId].lastSeen! > 45_000;
            room.players[playerId].lastSeen = Date.now();
            room.shutdownAt = undefined;
            let token = room.tokens?.[playerId];
            if (!token) {
              token = crypto.randomUUID();
              room.tokens = { ...(room.tokens ?? {}), [playerId]: token };
            }
            await setRoom(room);
            if (wasStale) await broadcastRoom(room); // host/projector sees them reconnect
            return NextResponse.json({ room: scrubRoomFor(room, playerId), token });
          }
          if (room.phase === 'game-over') {
            return NextResponse.json({ error: 'This game has ended — start a new one!' }, { status: 400 });
          }
          // Reconnection: if a *disconnected* player with the same name still holds a seat
          // (e.g. they lost their localStorage identity when an incognito session closed and
          // rejoined with a fresh UUID), reclaim that seat — preserving their score, hand and
          // joinedRound — instead of creating a duplicate. Only seats that have gone stale
          // (no heartbeat for >45 s, the same threshold presence/submission gating uses) are
          // reclaimable, so an active player who happens to share a name is never hijacked.
          const RECLAIM_STALE_MS = 45_000;
          const reclaimNow = Date.now();
          const reclaimable = Object.values(room.players).find(
            (p) => p.name.toLowerCase() === safeName.toLowerCase() &&
                   (!p.lastSeen || reclaimNow - p.lastSeen > RECLAIM_STALE_MS),
          );
          if (reclaimable) {
            reclaimable.lastSeen = reclaimNow;
            // Honour a fresh explicit pick; otherwise keep the seat's existing avatar so a
            // silent reconnect doesn't churn the player's identity to a new revolving default.
            if (typeof avatarId === 'string' && VALID_AVATAR_IDS.includes(avatarId)) {
              reclaimable.avatarId = resolveAvatar(room, avatarId, reclaimable.id);
            }
            room.shutdownAt = undefined;          // someone's back — cancel any pending shutdown
            // Issue a fresh token for the reclaimed seat (invalidates any prior one).
            const token = crypto.randomUUID();
            room.tokens = { ...(room.tokens ?? {}), [reclaimable.id]: token };
            await setRoom(room);
            await broadcastRoom(room);
            // Tell the client which id to adopt so its localStorage points at the reclaimed seat.
            return NextResponse.json({ room: scrubRoomFor(room, reclaimable.id), reclaimedPlayerId: reclaimable.id, token });
          }
          // A round is live: don't let a brand-new player appear mid-submission (they'd show on
          // the board without a fair shot at the active challenge). Existing players (handled
          // above) and reconnecting dropped players (reclaim, above) are still allowed in.
          if (room.phase === 'submission') {
            return NextResponse.json({ error: 'A round is in progress — you can join when it ends.' }, { status: 400 });
          }
          // Cap NEW arrivals only — the existing-seat and reclaim branches above are exempt, so
          // reconnection keeps working at a full table. Without a cap the room's single Redis
          // value grows ~2.5 KB of hand JSON per player and eventually exceeds Upstash's 1 MB
          // request limit, at which point EVERY mutating action throws, including end-game, and
          // the host cannot even close the room — it just sits out its 24 h TTL. Well before
          // that, past ~20 the broadcast exceeds Pusher's payload limit and the room silently
          // drops to polling (bug #18).
          if (Object.keys(room.players).length >= MAX_PLAYERS) {
            return NextResponse.json({ error: `This room is full (${MAX_PLAYERS} players).` }, { status: 400 });
          }
          const updated = addPlayer(room, playerId, safeName, resolveAvatar(room, avatarId));
          const token = crypto.randomUUID();
          updated.tokens = { ...(updated.tokens ?? {}), [playerId]: token };
          // A new arrival means the room is alive — cancel any idle-reap armed while the lobby sat
          // empty. Without this, a lobby whose shutdownAt has already elapsed could be deleted by
          // the very next GET poll (the reap check there) before this player's first heartbeat
          // clears it, so they'd join and immediately get "Room closed". The existing-seat and
          // reclaim branches already do this; the new-player branch was the one that didn't.
          updated.shutdownAt = undefined;
          await setRoom(updated);
          await broadcastRoom(updated);
          return NextResponse.json({ room: scrubRoomFor(updated, playerId), token });
        });
        return res ?? NextResponse.json({ error: 'Room busy — please try again' }, { status: 409 });
      }

      case 'kick-player': {
        const { code, hostId, playerId: targetId } = body as { code: string; hostId: string; playerId: string };
        if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
        if (!targetId || typeof targetId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const res = await withRoomLock(code, async () => {
          const room = await getRoom(code.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          // Host-only: match the raw hostId credential against the room's.
          if (!hostId || room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
          // Idempotent — already gone is success, not an error.
          if (!Object.hasOwn(room.players, targetId)) return NextResponse.json({ room: scrubRoomFor(room, '') });
          let updated = removePlayer(room, targetId);
          if (updated.tokens) delete updated.tokens[targetId]; // revoke the kicked seat's credential
          // Kicking the one player everyone is waiting on is usually WHY the host kicked them.
          // removePlayer drops their pending submission too, so the round may now be complete —
          // but allPlayersSubmitted is only ever re-evaluated by `submit`, so nothing noticed and
          // the room sat on the submission screen until the timer expired (up to 300 s).
          if (updated.phase === 'submission' && allPlayersSubmitted(updated)) {
            updated = advancePhase(updated);
          }
          await setRoom(updated);
          await broadcastRoom(updated); // the kicked client sees itself gone from players → exits
          return NextResponse.json({ room: scrubRoomFor(updated, '') });
        });
        return res ?? NextResponse.json({ error: 'Room busy — please try again' }, { status: 409 });
      }

      case 'advance': {
        const { code, hostId } = body;
        const res = await withRoomLock(code ?? '', async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          if (!hostId || room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
          // Require at least 2 players before leaving lobby
          if (room.phase === 'lobby' && Object.keys(room.players).length < 2) {
            return NextResponse.json({ error: 'Need at least 2 players to start.' }, { status: 400 });
          }
          // Block advancing while the AI judge is still deliberating
          if (room.phase === 'judging') {
            return NextResponse.json({ error: 'AI judge is deliberating — please wait.' }, { status: 400 });
          }
          const updated = advancePhase(room);
          await setRoom(updated);
          await broadcastRoom(updated);
          if (updated.phase === 'judging') {
            after(() => triggerJudge(code!.toUpperCase()).catch(() => {}));
          }
          return NextResponse.json({ room: scrubRoomFor(updated, '') });
        });
        return res ?? NextResponse.json({ error: 'Room busy — please try again' }, { status: 409 });
      }

      case 'update-settings': {
        const { code, hostId, totalRounds, timerDuration } = body as {
          code: string; hostId: string;
          totalRounds?: number; timerDuration?: number;
        };
        const res = await withRoomLock(code ?? '', async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          if (room.hostId !== hostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
          if (room.phase !== 'lobby') return NextResponse.json({ error: 'Can only update settings in lobby' }, { status: 400 });
          const safeRounds = typeof totalRounds === 'number' ? Math.max(1, Math.min(50, Math.round(totalRounds))) : room.totalRounds;
          const safeTimer = typeof timerDuration === 'number' ? Math.max(10, Math.min(300, Math.round(timerDuration))) : room.timerDuration;
          const updated = updateSettings(room, { totalRounds: safeRounds, timerDuration: safeTimer });
          await setRoom(updated);
          await broadcastRoom(updated);
          return NextResponse.json({ room: scrubRoomFor(updated, '') });
        });
        return res ?? NextResponse.json({ error: 'Room busy — please try again' }, { status: 409 });
      }

      case 'submit': {
        const { code, submission, token, auto } = body as { code: string; submission: Submission; token?: string; auto?: boolean };
        // Input guard — playerId must be a non-empty string
        if (!submission?.playerId || typeof submission.playerId !== 'string') {
          return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
        }
        // Shared per-room write lock (with brief retry) — serializes against
        // heartbeat/chat/advance/judging so none can clobber this submission, and retries
        // briefly rather than failing the player outright under momentary contention.
        const submitRes = await withRoomLock(code ?? '', async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          if (room.phase !== 'submission') {
            return NextResponse.json({ error: 'Not in submission phase' }, { status: 400 });
          }
          // Idempotent — double submission is a no-op
          if (room.submissions[submission.playerId]) {
            return NextResponse.json({ ok: true });
          }
          // Validate submitter is an active player and holds the matching token (can't submit
          // on another player's behalf).
          const submittingPlayer = Object.hasOwn(room.players, submission.playerId) ? room.players[submission.playerId] : undefined;
          // `code: 'identity'` on the two identity failures below (and the chat pair) is the
          // client's only way to tell "your seat or credential is gone" from "that card isn't
          // in your hand". Without it a player whose token was rotated by the name-based
          // reclaim saw a normal, live game and silently failed every action for the rest of it.
          if (!submittingPlayer) {
            return NextResponse.json({ error: 'Player not in this room', code: 'identity' }, { status: 403 });
          }
          if (!tokenOk(room, submission.playerId, token)) {
            return NextResponse.json({ error: 'Not authorized', code: 'identity' }, { status: 403 });
          }
          // Validate the submitted card is actually in the player's hand — use server-side card data
          const serverCard = submittingPlayer.hand.find((c) => c.id === submission.schemeCard?.id);
          if (!serverCard) {
            return NextResponse.json({ error: 'Card not in your hand' }, { status: 403 });
          }
          // Sanitize and filter explanation
          const safeExplanation = typeof submission.explanation === 'string'
            // Cap AFTER filtering: filterText NFKC-normalises, and one squared-katakana
            // character becomes six — slicing first let 200 typed characters store 1200,
            // with a word count of 1 that sailed past the 25-word check below.
            ? filterText(submission.explanation).trim().slice(0, 200)
            : '';
          // A manual submit requires a justification; an auto-submit at timer expiry (the
          // player's own device flushing its draft) may have an empty one — they still play
          // their selected/random card so they have an entry in the round.
          if (!safeExplanation && !auto) {
            return NextResponse.json({ error: 'Explanation is required' }, { status: 400 });
          }
          // Enforce 25-word limit server-side (mirrors client UI)
          const wordCount = safeExplanation.split(/\s+/).filter(Boolean).length;
          if (wordCount > 25) {
            return NextResponse.json({ error: 'Explanation too long (max 25 words)' }, { status: 400 });
          }
          // Build submission entirely from server state — no client-supplied card data or identity
          const safeSubmission: Submission = {
            playerId: submission.playerId,
            playerName: submittingPlayer.name,
            avatarId: submittingPlayer.avatarId,
            schemeCard: serverCard,            // authoritative server-side card object
            explanation: safeExplanation,
            submittedAt: Date.now(),           // always server-side timestamp — never trust client
          };
          const updated = addSubmission(room, safeSubmission);
          // Submitting is definitive proof of presence — refresh the heartbeat so a
          // player who submits (then locks their phone / backgrounds the tab, which can
          // throttle the JS heartbeat timer) is never wrongly treated as disconnected by
          // allPlayersSubmitted(). Without this, the auto-advance can stall.
          if (updated.players[submission.playerId]) {
            updated.players[submission.playerId].lastSeen = Date.now();
          }
          await setRoom(updated);
          // Broadcast happens before auto-advance so clients see the submission tick
          await broadcastRoom(updated);
          if (allPlayersSubmitted(updated)) {
            // Delay 2 s before advancing so the projector shows the final submission
            // tick before the phase switches. Runs after the response is sent so the
            // submitting player's request isn't held open.
            after(async () => {
              // Background task: a throw here (e.g. a Redis blip) would be an unhandled
              // rejection since the response has already been sent. Swallow it — the
              // timer-expire path is the fallback that still advances the stalled phase.
              try {
                await new Promise<void>(resolve => setTimeout(resolve, 2000));
                await withRoomLock(code, async () => {
                  const fresh = await getRoom(code.toUpperCase());
                  if (fresh?.phase === 'submission') {
                    const revealed = advancePhase(fresh);
                    await setRoom(revealed);
                    await broadcastRoom(revealed);
                  }
                });
              } catch { /* fallback: timer-expire advances the phase */ }
            });
          }
          return NextResponse.json({ ok: true });
        });
        return submitRes ?? NextResponse.json({ error: 'Conflict — please try again' }, { status: 409 });
      }

      case 'timer-expire': {
        const { code } = body;
        if (!code || typeof code !== 'string') return NextResponse.json({ ok: true });
        const upperCode = code.toUpperCase();
        // Unauthenticated by design (the phase + elapsed-timer check is the real guard), so
        // bound it per room: in normal play every player AND the projector fire this within
        // milliseconds of each other, and without a cap anyone holding a 4-char code can loop
        // it. Generous enough for a full table firing once each per round.
        if (!(await checkRateLimit(`ratelimit:expire:${upperCode}`, 40, 60))) {
          return NextResponse.json({ ok: true });
        }
        // Cheap unlocked pre-check BEFORE the write lock. Only one of those N+1 callers can do
        // any work; the rest used to queue for the room's write lock (each with its own Redis
        // read) purely to discover the phase had already moved on — contending with the very
        // submissions still trying to land. The authoritative check is still inside the lock
        // below; this only skips callers that definitely have nothing to do. The 1 s margin
        // keeps the marginal "timer is about to elapse" case on the old serialize-and-recheck
        // path, so no expiry is lost to a race between the read and the check.
        const pre = await getRoom(upperCode);
        if (!pre || pre.phase !== 'submission') return NextResponse.json({ ok: true });
        if (pre.timerEndsAt && Date.now() < pre.timerEndsAt - 1_000) return NextResponse.json({ ok: true });
        // Shared per-room write lock (with brief retry) — serializes with submit/heartbeat/
        // judging so a timer expiry can't race the auto-advance or a submission write.
        await withRoomLock(upperCode, async () => {
          const room = await getRoom(upperCode);
          if (!room) return;
          // Idempotent — only act if still in submission and timer has actually elapsed.
          // No hostId required: the phase + elapsed-timer check is the real guard; the
          // lock prevents double-advancing. Any client (player, projector) can fire this
          // once the timer is genuinely up.
          if (room.phase !== 'submission') return;
          if (!room.timerEndsAt || Date.now() < room.timerEndsAt) return;
          // Safety net so every in-round player has a card in play this round: auto-submit a
          // random card (no justification) for anyone who hasn't submitted. Connected players'
          // own devices flush their typed draft just before expiry (handled client-side); this
          // covers players who typed nothing or whose phone is closed. Mid-round late joiners
          // (joinedRound === room.round) sit the round out, matching allPlayersSubmitted().
          let filled = room;
          for (const p of Object.values(room.players)) {
            if (p.joinedRound >= room.round) continue;
            if (filled.submissions[p.id]) continue;
            if (!p.hand || p.hand.length === 0) continue;
            const card = p.hand[Math.floor(Math.random() * p.hand.length)];
            filled = addSubmission(filled, {
              playerId: p.id,
              playerName: p.name,
              avatarId: p.avatarId,
              schemeCard: card,
              explanation: '',
              submittedAt: Date.now(),
            });
          }
          const revealed = advancePhase(filled);
          await setRoom(revealed);
          await broadcastRoom(revealed);
        });
        return NextResponse.json({ ok: true });
      }

      case 'emote': {
        const { code, playerId, emote, token } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId; emote: string; token?: string;
        };
        // Single source of truth — a hardcoded copy here would silently drift when emotes change.
        if (!isEmoteId(emote)) return NextResponse.json({ ok: true });
        const emoteRoom = await getRoom(code?.toUpperCase());
        const emotePlayer = emoteRoom && Object.hasOwn(emoteRoom.players, playerId) ? emoteRoom.players[playerId] : undefined;
        if (!emotePlayer) return NextResponse.json({ ok: true }); // silently drop unknown senders
        if (!tokenOk(emoteRoom!, playerId, token)) return NextResponse.json({ ok: true }); // can't emote as another player
        // Rate-limit AFTER auth: the bucket is keyed on playerId, so charging it before the
        // token check let anyone spoof a victim's playerId and exhaust the victim's own quota.
        if (!(await checkRateLimit(`ratelimit:emote:${playerId}`, 20, 60))) {
          return NextResponse.json({ ok: true });
        }
        await triggerEvent(getRoomChannel(code!.toUpperCase()), 'emote', {
          playerId,
          playerName: emotePlayer.name,
          avatarId: emotePlayer.avatarId,
          emote,
          timestamp: Date.now(),
        });
        return NextResponse.json({ ok: true });
      }

      case 'chat': {
        const { code, message, token } = body as { code: string; message: Omit<ChatMessage, 'id' | 'sentAt'> & { text: string }; token?: string };
        // Same reasoning as heartbeat: authenticate on an unlocked read first, so an
        // unauthenticated flood cannot hold the room's write lock. The per-sender bucket still
        // lives inside the lock (it is charged only to an authenticated player, on purpose);
        // this per-room cap is what an unauthenticated caller hits.
        if (!(await checkRateLimit(`ratelimit:chatroom:${String(code ?? '').toUpperCase()}`, 240, 60))) {
          return NextResponse.json({ error: 'Sending too fast' }, { status: 429 });
        }
        {
          const pre = await getRoom(String(code ?? '').toUpperCase());
          const pid = message?.playerId;
          if (!pre || typeof pid !== 'string' || !Object.hasOwn(pre.players, pid) || !tokenOk(pre, pid, token)) {
            return NextResponse.json({ error: 'Not authorized' , code: 'identity' }, { status: 403 });
          }
        }
        const res = await withRoomLock(code ?? '', async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          // Validate sender is an actual room player and holds the matching token.
          const chatPlayer = Object.hasOwn(room.players, message?.playerId ?? '') ? room.players[message.playerId] : undefined;
          if (!chatPlayer) return NextResponse.json({ error: 'Player not in room', code: 'identity' }, { status: 403 });
          if (!tokenOk(room, message.playerId, token)) return NextResponse.json({ error: 'Not authorized', code: 'identity' }, { status: 403 });
          // Rate-limit AFTER auth (30 messages/player/minute): the bucket is keyed on playerId,
          // so charging it before the token check let anyone spoof a victim's playerId and burn
          // the victim's own quota. Now only an authenticated sender charges their own bucket.
          if (!(await checkRateLimit(`ratelimit:chat:${message.playerId}`, 30, 60))) {
            return NextResponse.json({ error: 'Sending too fast' }, { status: 429 });
          }
          // Cap BEFORE filtering. filterText normalises and runs ~29 global regex passes, and
          // this runs inside withRoomLock — an unbounded string here burns CPU while holding the
          // room's write lock, stalling submissions and heartbeats behind it. join and submit
          // already truncate first; chat was the one place the cap sat on the wrong side.
          // Pre-slice bounds the CPU cost inside the room lock; the post-slice is the real cap,
          // because filterText expands what it normalises.
          const rawText = typeof message?.text === 'string' ? message.text.slice(0, 500).trim() : '';
          const filtered = filterText(rawText).slice(0, 500);
          if (!filtered) return NextResponse.json({ ok: true });
          const chatMsg: ChatMessage = {
            id: crypto.randomUUID(),
            playerId: message.playerId,
            playerName: chatPlayer.name,        // trust server, not client
            avatarId: chatPlayer.avatarId,      // trust server, not client
            text: filtered.slice(0, 120),
            sentAt: Date.now(),
          };
          const updated = addMessage(room, chatMsg);
          await setRoom(updated);
          await triggerEvent(getRoomChannel(code?.toUpperCase()), 'game:chat', chatMsg);
          return NextResponse.json({ ok: true });
        });
        return res ?? NextResponse.json({ ok: true });
      }

      case 'heartbeat': {
        const { code: hbCode, playerId: hbPid, token: hbToken } = body as { code: string; playerId: string; token?: string };
        if (!hbCode || !hbPid) return NextResponse.json({ ok: true });
        // Authenticate on an UNLOCKED read before queuing for the room's write lock.
        //
        // This is the seat-theft chain, and it is why the order matters. `withRoomLock` polls for
        // ~1 s and there is no queue, so a flood of unauthenticated heartbeats — each of which
        // used to take the lock and only then discover it had no business writing — starves
        // legitimate writers. PlayerView beats every 20 s, fire-and-forget with no retry, so
        // roughly a minute of starvation drops three beats and a player sitting there with their
        // phone open goes `lastSeen`-stale. The name-based reclaim then hands their seat, hand
        // and score to anyone who can read their name off the projector. The reclaim tradeoff
        // assumes "this player actually left"; without this check, any seat is stealable on
        // demand. Rate-limited per room as well, so the flood cannot even reach the read.
        if (!(await checkRateLimit(`ratelimit:hb:${hbCode.toUpperCase()}`, 300, 60))) {
          return NextResponse.json({ ok: true });
        }
        const hbPre = await getRoom(hbCode.toUpperCase());
        if (!hbPre || !Object.hasOwn(hbPre.players, hbPid) || !tokenOk(hbPre, hbPid, hbToken)) {
          return NextResponse.json({ ok: true });   // same opaque reply as before — no oracle
        }
        // Under the room lock so this frequent full-room write never clobbers a concurrent
        // submission or verdict (the prior unlocked write was the main room-state race).
        await withRoomLock(hbCode, async () => {
          const hbRoom = await getRoom(hbCode.toUpperCase());
          if (!hbRoom || !Object.hasOwn(hbRoom.players, hbPid)) return;
          if (!tokenOk(hbRoom, hbPid, hbToken)) return; // can't refresh another player's presence

          const prevSeen = hbRoom.players[hbPid].lastSeen ?? 0;
          const now = Date.now();
          hbRoom.players[hbPid].lastSeen = now;

          // Presence: count how many players are active after this update
          const activePlayers = Object.values(hbRoom.players)
            .filter(p => p.lastSeen && now - p.lastSeen < 45_000);

          // Auto-shutdown only ever reaps a room nobody is *playing*: one still in the lobby, or
          // one whose game is over. It used to arm on any beat that saw ≤1 active player, with no
          // regard for phase — so a two-player round where one phone had locked (>45 s without a
          // beat, which backgrounded mobile Safari does routinely) scheduled a live game for
          // deletion, and five quiet minutes later a poll destroyed it mid-round with every score.
          if (isReapable(hbRoom.phase)) {
            if (activePlayers.length <= 1) {
              // Last person standing — each subsequent beacon resets the clock, so the room only
              // dies once nobody has checked in for the whole window.
              hbRoom.shutdownAt = now + reapWindowMs(hbRoom.phase);
            } else {
              hbRoom.shutdownAt = undefined;   // multiple people about — cancel any pending shutdown
            }
          } else {
            // A game is in flight. Clear anything armed earlier (e.g. during the lobby) so it
            // can't fire once play has started.
            hbRoom.shutdownAt = undefined;
          }

          await setRoom(hbRoom);
          // Broadcast on reconnect (was stale > 45 s) so host/projector updates
          if (now - prevSeen > 45_000) await broadcastRoom(hbRoom);
        });
        return NextResponse.json({ ok: true });
      }

      case 'end-game': {
        const { code: egCode, hostId: egHostId } = body as { code: string; hostId: string };
        if (!egCode || !egHostId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        const res = await withRoomLock(egCode, async () => {
          const egRoom = await getRoom(egCode.toUpperCase());
          if (!egRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          if (egRoom.hostId !== egHostId) return NextResponse.json({ error: 'Not the host' }, { status: 403 });
          if (egRoom.phase === 'game-over') return NextResponse.json({ room: scrubRoomFor(egRoom, '') });
          const ended = { ...egRoom, phase: 'game-over' as const, shutdownAt: undefined };
          await setRoom(ended);
          await broadcastRoom(ended);
          return NextResponse.json({ room: scrubRoomFor(ended, '') });
        });
        return res ?? NextResponse.json({ error: 'Room busy — please try again' }, { status: 409 });
      }

      case 'music-toggle': {
        const { code, hostId: musicHostId, muted } = body as { code: string; hostId: string; muted: boolean };
        if (!code || typeof code !== 'string') {
          return NextResponse.json({ error: 'Room code required' }, { status: 400 });
        }
        const musicRoom = await getRoom(code.toUpperCase());
        if (!musicRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        if (!musicHostId || musicRoom.hostId !== musicHostId) {
          return NextResponse.json({ error: 'Not the host' }, { status: 403 });
        }
        if (!(await checkRateLimit(`ratelimit:music:${musicHostId}`, 10, 60))) {
          return NextResponse.json({ ok: true });
        }
        await triggerEvent(getRoomChannel(code.toUpperCase()), 'music:toggle', { muted: Boolean(muted) });
        return NextResponse.json({ ok: true });
      }

      case 'kick-judge': {
        // Recovery watchdog: a client (projector) calls this if the game has been stuck in
        // the judging phase too long — e.g. the original after()-scheduled triggerJudge never
        // ran on serverless. Awaited (not via after()) so it can't depend on the same
        // mechanism that may have failed; triggerJudge is idempotent (re-checks phase and
        // takes the per-round lock), so repeated kicks are safe.
        const { code: kjCode } = body as { code: string };
        if (!kjCode || typeof kjCode !== 'string') return NextResponse.json({ ok: true });
        // Rate-limit so a stuck-room watchdog (or an abuser) can't fan out paid Claude calls.
        // The watchdog only fires every 12s while genuinely stuck, so this is generous.
        if (!(await checkRateLimit(`ratelimit:kick:${kjCode.toUpperCase()}`, 6, 60))) {
          return NextResponse.json({ ok: true });
        }
        await triggerJudge(kjCode.toUpperCase()).catch(() => {});
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    if (message.includes('Redis unavailable') || message.includes('Failed to save')) {
      return NextResponse.json({ error: 'Storage unavailable — try again in a moment' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Something went wrong — please try again' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    // Optional: requesting player's own ID — they receive their own hand back; everyone else's
    // is stripped. The hand is only returned if the caller proves identity with the matching
    // token (sent as an x-player-token header), so one player can't read another's hand.
    const me = req.nextUrl.searchParams.get('me') ?? '';
    const room = await getRoom(code.toUpperCase());
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

    // Auto-shutdown: reap a room nobody is playing once its window has passed. The phase check
    // is deliberately repeated here rather than trusted from the heartbeat — it's the guard that
    // actually prevents a live game being destroyed, and it also covers a shutdownAt armed in
    // the lobby by a room that has since started playing without anyone beating again.
    if (room.shutdownAt && Date.now() > room.shutdownAt && isReapable(room.phase)) {
      // Under the room lock, re-reading and re-checking, so a concurrent locked mutation (a late
      // heartbeat/advance) can't setRoom right after the delete and resurrect a zombie room —
      // and so a game that started between the two reads is not deleted out from under itself.
      const gone = await withRoomLock(code.toUpperCase(), async () => {
        const fresh = await getRoom(code.toUpperCase());
        // Already deleted by a concurrent reaper between our first read and this lock: the room is
        // gone, so 404 rather than falling through and serving the stale pre-delete snapshot we
        // read a moment ago.
        if (!fresh) return true;
        if (fresh.shutdownAt && Date.now() > fresh.shutdownAt && isReapable(fresh.phase)) {
          await deleteRoom(code.toUpperCase());
          return true;
        }
        return false;
      });
      if (gone) {
        return NextResponse.json({ error: 'Room closed — it was idle for too long' }, { status: 404 });
      }
    }

    const token = req.headers.get('x-player-token');
    const verifiedMe = me && tokenOk(room, me, token) ? me : '';
    return NextResponse.json({ room: scrubRoomFor(room, verifiedMe) });
  } catch {
    return NextResponse.json({ error: 'Storage unavailable — try again in a moment' }, { status: 503 });
  }
}

// Single per-room write lock. Every read-modify-write of a room must run inside this so
// concurrent writers (submit, advance, heartbeat, chat, judging, …) serialize and can't
// clobber each other's snapshot — e.g. a stale heartbeat reverting winner→judging (freeze)
// or erasing a just-added submission. Brief retry so a momentarily-held lock doesn't fail
// the request outright; returns null only if it stays contended (~1s), letting the caller
// return a safe "busy" fallback.
async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T | null> {
  const key = `lock:room:${code.toUpperCase()}`;
  for (let i = 0; i < 40; i++) {
    // The token is what makes the release safe. A critical section that awaits a slow network
    // call can outrun the 10 s TTL, by which point Redis has handed the lock to the next
    // writer; releasing by key alone would then delete THAT writer's lock and let a third in
    // on a stale snapshot. Releasing by token makes the late release a no-op instead.
    const token = await acquireLock(key, 10);
    if (token) {
      try { return await fn(); }
      finally { await releaseLock(key, token); }
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}

async function triggerJudge(code: string) {
  // Read the room first so the judging lock can be scoped to the *current round*. A room-only
  // lock key (with its 60 s TTL) would otherwise stay held after round N's verdict and
  // silently block round N+1's judge when rounds complete in under 60 s — freezing the
  // game at the judging phase. Per-round keys keep the double-fire guard while letting
  // each round judge independently.
  const room = await getRoom(code);
  if (!room || room.phase !== 'judging') return;

  // Distributed lock — prevent double-judging if after() fires more than once. The TTL
  // (JUDGING_LOCK_TTL_MS, 30 s) is kept comfortably above the judge's own deadline (22 s at a
  // full table, shared with the ~1 s retry if the API rejects structured outputs) but short
  // enough that, if the function is killed mid-judge, the lock clears quickly so the
  // kick-judge watchdog can recover.
  const lockKey = `lock:judging:${code}:${room.round}`;
  const acquired = await acquireLock(lockKey, JUDGING_LOCK_TTL_MS / 1000);
  if (!acquired) return; // Another instance already handling this round

  if (!room.currentChallenge) {
    // Corrupt/legacy room with no challenge in judging — resolve to no-winner so the round
    // still advances to the winner screen instead of wedging in judging forever.
    console.error('[triggerJudge] currentChallenge is null in judging phase — resolving no-winner');
    await withRoomLock(code, async () => {
      const fresh = await getRoom(code);
      if (!fresh || fresh.phase !== 'judging') return;
      const updated = applyVerdict(fresh, noWinnerVerdict("The judge couldn't pick a winner this round."));
      await setRoom(updated);
      await broadcastRoom(updated);
    });
    return;
  }
  const submissions = Object.values(room.submissions);

  // No submissions — show an explicit "no winner this round" on the winner screen rather
  // than silently skipping it (so it never looks like someone won when no one played).
  if (submissions.length === 0) {
    await withRoomLock(code, async () => {
      const fresh = await getRoom(code);
      if (!fresh || fresh.phase !== 'judging') return;
      const updated = applyVerdict(fresh, noWinnerVerdict('No one submitted an answer this round.'));
      await setRoom(updated);
      await broadcastRoom(updated);
    });
    return;
  }

  const verdict = await judgeRound(room.currentChallenge, submissions, { tag: `${code}:${room.round}` });

  // Apply the verdict under the room lock (and re-read fresh) so a concurrent heartbeat or
  // chat write can't clobber the winner phase back to judging and freeze the game. The
  // Claude call above stays outside the lock so it never blocks other writers.
  await withRoomLock(code, async () => {
    const freshRoom = await getRoom(code);
    // Phase AND round: a judge run that somehow outlived the lock must never apply a stale
    // round's verdict to a later round that happens to be in judging.
    if (!freshRoom || freshRoom.phase !== 'judging' || freshRoom.round !== room.round) return;
    const updated = applyVerdict(freshRoom, verdict);
    await setRoom(updated);
    await broadcastRoom(updated);
  });
}

// ── Admin: DELETE /api/game?code=XXXX ────────────────────────────────────────
// Immediately deletes a room. Requires valid admin Basic Auth credentials.
function checkAdminAuth(req: NextRequest): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? '';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  if (!expectedUser || !expectedPass) return false;
  const auth = req.headers.get('authorization') ?? '';
  const [, encoded] = auth.split(' ');
  if (!encoded) return false;
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return false;
  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);
  // Compare fixed-length SHA-256 digests rather than length-padded buffers. Buffer.alloc sizes by
  // string length (UTF-16 units) while Buffer.write emits UTF-8 bytes, so a multibyte credential
  // was silently truncated and a wrong-but-same-byte-prefix value could authenticate. Hashing is
  // constant-time on the 32-byte digests and length-independent for any UTF-8 input.
  const digest = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest();
  const userOk = crypto.timingSafeEqual(digest(user), digest(expectedUser));
  const passOk = crypto.timingSafeEqual(digest(pass), digest(expectedPass));
  return userOk && passOk;
}

export async function DELETE(req: NextRequest) {
  // This endpoint runs admin Basic Auth and nothing else, which made it a better brute-force
  // door than /api/admin (which IS throttled): unlimited guesses, and a perfect oracle — 401 for
  // wrong credentials, 400/404 for right ones. Charge every attempt, keyed on the supplied
  // credential as well as the IP, so a wrong password costs the guesser regardless of where it
  // comes from and a whole venue sharing one egress IP cannot lock the real operator out.
  const attempt = crypto.createHash('sha256')
    .update(`${getIp(req)}|${req.headers.get('authorization') ?? ''}`)
    .digest('hex')
    .slice(0, 32);
  if (!(await checkRateLimit(`ratelimit:admindel:${attempt}`, 10, 900))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Vikas75 Admin"' },
    });
  }
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase();
  if (!code || !/^[A-Z]{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
  }
  // Under the room lock, and re-read inside it, for the same reason the GET reaper does: a
  // concurrent locked mutation (a heartbeat is in flight a few percent of the time in an
  // occupied room) holds a pre-delete snapshot and would setRoom it straight back afterwards.
  // End Room would report success, the room would vanish from the list, and it would reappear
  // on refresh and run out its full 24 h TTL.
  const deleted = await withRoomLock(code, async () => {
    const room = await getRoom(code);
    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    await deleteRoom(code);
    return null;
  });
  if (deleted) return deleted;
  // Clients discover deletion via the GET 404 path ("Room Closed" screen); there is no
  // 'game:room-closed' Pusher listener, so no broadcast here.
  return NextResponse.json({ ok: true });
}
