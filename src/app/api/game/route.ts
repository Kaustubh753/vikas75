import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getRoom, setRoom, deleteRoom, checkRoomCreationLimit, checkRateLimit, acquireLock, releaseLock } from '@/lib/redis';
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
import { filterText } from '@/lib/word-filter';
import type { Submission, AvatarId, ChatMessage, GameRoom } from '@/types/game';

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
function scrubRoomFor(room: GameRoom, playerId: string) {
  return {
    ...stripSecrets(room),
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [id, { ...p, hand: id === playerId ? p.hand : [] }]),
    ),
  };
}

/** A player's action/own-hand read is allowed if no token has been issued for them (legacy
 *  rooms created before tokens existed) or the supplied token matches the issued one. */
function tokenOk(room: GameRoom, playerId: string, token: unknown): boolean {
  const expected = room.tokens?.[playerId];
  if (!expected) return true; // legacy / no token issued — allow (transitional)
  return typeof token === 'string' && token === expected;
}

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

// Simple in-memory rate limiter — best-effort (not shared across serverless instances)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getIp(req: NextRequest): string {
  // x-real-ip is set by Vercel's edge and cannot be client-spoofed.
  // Fall back to the last (CDN-appended) value in x-forwarded-for rather than the first
  // (which is client-controlled and trivially spoofable).
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  );
}

function sanitizeName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return name.replace(/[<>]/g, '').trim().slice(0, 30);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create-room': {
        const { hostId, hostName, totalRounds, timerDuration } = body;
        const safeName = sanitizeName(hostName);
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!hostId || typeof hostId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
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

        // Generate a unique room code — retry up to 10 times to avoid collisions
        let roomCode: string | null = null;
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = generateRoomCode();
          if (!(await getRoom(candidate))) { roomCode = candidate; break; }
        }
        if (!roomCode) return NextResponse.json({ error: 'Could not generate unique room code — try again' }, { status: 500 });

        const room = createRoom(hostId, safeName, roomCode, safeRounds, safeTimer);
        await setRoom(room);
        return NextResponse.json({ room: stripSecrets(room) });
      }

      case 'join': {
        const { code, playerId, playerName, avatarId } = body as {
          code: string; playerId: string; playerName: string; avatarId: AvatarId;
        };
        if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Room code is required' }, { status: 400 });
        const ip = getIp(req);
        if (!(await checkRateLimit(`ratelimit:join:${ip}`, 15, 60))) {
          return NextResponse.json({ error: 'Too many requests — slow down' }, { status: 429 });
        }
        const safeName = filterText(sanitizeName(playerName));
        if (!safeName) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        if (!playerId || typeof playerId !== 'string' || playerId.length > 64) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        const res = await withRoomLock(code, async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found — check your code' }, { status: 404 });
          // Idempotent rejoin — always allowed for existing players. Ensure a token exists
          // for this seat and return it so the client can (re)store its credential.
          if (room.players[playerId]) {
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
          const updated = addPlayer(room, playerId, safeName, resolveAvatar(room, avatarId));
          const token = crypto.randomUUID();
          updated.tokens = { ...(updated.tokens ?? {}), [playerId]: token };
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
          if (!room.players[targetId]) return NextResponse.json({ room: scrubRoomFor(room, '') });
          const updated = removePlayer(room, targetId);
          if (updated.tokens) delete updated.tokens[targetId]; // revoke the kicked seat's credential
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
          return NextResponse.json({ room: stripSecrets(updated) });
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
          return NextResponse.json({ room: stripSecrets(updated) });
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
          const submittingPlayer = room.players[submission.playerId];
          if (!submittingPlayer) {
            return NextResponse.json({ error: 'Player not in this room' }, { status: 403 });
          }
          if (!tokenOk(room, submission.playerId, token)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
          }
          // Validate the submitted card is actually in the player's hand — use server-side card data
          const serverCard = submittingPlayer.hand.find((c) => c.id === submission.schemeCard?.id);
          if (!serverCard) {
            return NextResponse.json({ error: 'Card not in your hand' }, { status: 403 });
          }
          // Sanitize and filter explanation
          const safeExplanation = typeof submission.explanation === 'string'
            ? filterText(submission.explanation.trim().slice(0, 200))
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
        // Redis-backed rate limit — works across serverless instances (20 emotes/player/minute)
        if (!(await checkRateLimit(`ratelimit:emote:${playerId ?? 'anon'}`, 20, 60))) {
          return NextResponse.json({ ok: true });
        }
        const VALID_EMOTES = ['masterstroke','aatmanirbhar','vishwaguru','fakir','antinational','56inch'];
        if (!emote || !VALID_EMOTES.includes(emote)) return NextResponse.json({ ok: true });
        const emoteRoom = await getRoom(code?.toUpperCase());
        const emotePlayer = emoteRoom?.players[playerId];
        if (!emotePlayer) return NextResponse.json({ ok: true }); // silently drop unknown senders
        if (!tokenOk(emoteRoom!, playerId, token)) return NextResponse.json({ ok: true }); // can't emote as another player
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
        // Redis-backed rate limit — works across serverless instances (30 messages/player/minute)
        if (!(await checkRateLimit(`ratelimit:chat:${message?.playerId ?? 'anon'}`, 30, 60))) {
          return NextResponse.json({ error: 'Sending too fast' }, { status: 429 });
        }
        const res = await withRoomLock(code ?? '', async () => {
          const room = await getRoom(code?.toUpperCase());
          if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
          // Validate sender is an actual room player and holds the matching token.
          const chatPlayer = room.players[message?.playerId];
          if (!chatPlayer) return NextResponse.json({ error: 'Player not in room' }, { status: 403 });
          if (!tokenOk(room, message.playerId, token)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
          const rawText = typeof message?.text === 'string' ? message.text.trim() : '';
          const filtered = filterText(rawText);
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
        // Under the room lock so this frequent full-room write never clobbers a concurrent
        // submission or verdict (the prior unlocked write was the main room-state race).
        await withRoomLock(hbCode, async () => {
          const hbRoom = await getRoom(hbCode.toUpperCase());
          if (!hbRoom || !hbRoom.players[hbPid]) return;
          if (!tokenOk(hbRoom, hbPid, hbToken)) return; // can't refresh another player's presence

          const prevSeen = hbRoom.players[hbPid].lastSeen ?? 0;
          const now = Date.now();
          hbRoom.players[hbPid].lastSeen = now;

          // Presence: count how many players are active after this update
          const activePlayers = Object.values(hbRoom.players)
            .filter(p => p.lastSeen && now - p.lastSeen < 45_000);

          if (activePlayers.length <= 1) {
            // Last person standing — schedule auto-shutdown 5 min from now.
            // Each subsequent beacon resets the clock, so the room only dies
            // 5 min after the very last beacon from anyone.
            hbRoom.shutdownAt = now + 5 * 60 * 1000;
          } else {
            // Multiple people active — cancel any pending shutdown
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
          if (egRoom.phase === 'game-over') return NextResponse.json({ room: stripSecrets(egRoom) });
          const ended = { ...egRoom, phase: 'game-over' as const, shutdownAt: undefined };
          await setRoom(ended);
          await broadcastRoom(ended);
          return NextResponse.json({ room: stripSecrets(ended) });
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
        if (!rateLimit(`music-toggle:${musicHostId}`, 10, 60_000)) {
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

    // Auto-shutdown: if all players have been gone for 5 minutes, delete the room
    if (room.shutdownAt && Date.now() > room.shutdownAt) {
      await deleteRoom(code.toUpperCase());
      return NextResponse.json({ error: 'Room closed — all players disconnected' }, { status: 404 });
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
    if (await acquireLock(key, 10)) {
      try { return await fn(); }
      finally { await releaseLock(key); }
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

  // Distributed lock — prevent double-judging if after() fires more than once. TTL is kept
  // comfortably above the judge's own 8s timeout but short enough that, if the function is
  // killed mid-judge, the lock clears quickly so the kick-judge watchdog can recover.
  const lockKey = `lock:judging:${code}:${room.round}`;
  const acquired = await acquireLock(lockKey, 20);
  if (!acquired) return; // Another instance already handling this round

  if (!room.currentChallenge) {
    console.error('[triggerJudge] currentChallenge is null in judging phase — skipping');
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

  const verdict = await judgeRound(room.currentChallenge, submissions);

  // Apply the verdict under the room lock (and re-read fresh) so a concurrent heartbeat or
  // chat write can't clobber the winner phase back to judging and freeze the game. The
  // Claude call above stays outside the lock so it never blocks other writers.
  await withRoomLock(code, async () => {
    const freshRoom = await getRoom(code);
    if (!freshRoom || freshRoom.phase !== 'judging') return;
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
  const maxLen = Math.max(user.length, expectedUser.length, pass.length, expectedPass.length);
  const bufU1 = Buffer.alloc(maxLen); bufU1.write(user);
  const bufU2 = Buffer.alloc(maxLen); bufU2.write(expectedUser);
  const bufP1 = Buffer.alloc(maxLen); bufP1.write(pass);
  const bufP2 = Buffer.alloc(maxLen); bufP2.write(expectedPass);
  return crypto.timingSafeEqual(bufU1, bufU2) && crypto.timingSafeEqual(bufP1, bufP2);
}

export async function DELETE(req: NextRequest) {
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
  const room = await getRoom(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  await deleteRoom(code);
  // Notify any connected clients the room has closed (best-effort)
  await triggerEvent(getRoomChannel(code), 'game:room-closed', {});
  return NextResponse.json({ ok: true });
}
