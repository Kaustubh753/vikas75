import type {
  GameRoom,
  Player,
  AvatarId,
  SchemeCard,
  ChallengeCard,
  Submission,
  JudgeVerdict,
  ChatMessage,
} from '@/types/game';
import challengesData from '@/../context/cards_challenges.json';
import schemesData from '@/../context/cards_schemes.json';

const challenges = challengesData as ChallengeCard[];
const schemes = schemesData as SchemeCard[];

const HAND_SIZE = 7;
const DEFAULT_TOTAL_ROUNDS = 5;
const DEFAULT_TIMER_DURATION = 90; // seconds
const MAX_CHAT_MESSAGES = 20;

export function generateRoomCode(): string {
  // No I, O — too similar to 1 and 0 on a projector screen
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Always deals from the full pool — supports 15+ players, allows overlapping hands
export function dealHand(): SchemeCard[] {
  return shuffle([...schemes]).slice(0, HAND_SIZE);
}

export function createRoom(
  hostId: string,
  hostName: string,
  code: string,
  totalRounds = DEFAULT_TOTAL_ROUNDS,
  timerDuration = DEFAULT_TIMER_DURATION,
): GameRoom {
  return {
    code,
    hostId,
    hostName,
    phase: 'lobby',
    round: 0,
    totalRounds,
    timerDuration,
    players: {},  // host is not a player
    currentChallenge: null,
    submissions: {},
    lastVerdict: null,
    timerEndsAt: null,
    cardSetId: 'vikas75',
    createdAt: Date.now(),
    messages: [],
    usedChallengeIds: [],
  };
}

export function updateSettings(
  room: GameRoom,
  settings: { totalRounds?: number; timerDuration?: number },
): GameRoom {
  return {
    ...room,
    totalRounds: settings.totalRounds ?? room.totalRounds,
    timerDuration: settings.timerDuration ?? room.timerDuration,
  };
}

export function addPlayer(room: GameRoom, playerId: string, playerName: string, avatarId: AvatarId): GameRoom {
  return {
    ...room,
    players: {
      ...room.players,
      [playerId]: {
        id: playerId,
        name: playerName,
        avatarId,
        score: 0,
        roundsWon: 0,
        hand: dealHand(),
        joinedRound: room.round,
        lastSeen: Date.now(),
      },
    },
  };
}

/** Remove a player (and any in-flight submission of theirs) from the room — used by the
 *  host "kick" action. The caller is responsible for also dropping the player's auth token. */
export function removePlayer(room: GameRoom, playerId: string): GameRoom {
  const players = { ...room.players };
  delete players[playerId];
  const submissions = { ...room.submissions };
  delete submissions[playerId];
  return { ...room, players, submissions };
}

export function startRound(room: GameRoom): GameRoom {
  const nextRound = room.round + 1;
  // Use the per-room tracking of drawn challenge IDs (falls back to empty for old rooms)
  const usedIds = room.usedChallengeIds ?? [];
  const remainingChallenges = challenges.filter((c) => !usedIds.includes(c.id));
  // Cycle from the beginning once all 30 are exhausted
  const pool = remainingChallenges.length > 0 ? remainingChallenges : challenges;
  const challenge = shuffle(pool)[0] ?? challenges[0];

  // Deal fresh hands for all players every round
  const refreshedPlayers = Object.fromEntries(
    Object.entries(room.players).map(([id, p]) => [id, { ...p, hand: dealHand() }])
  );

  return {
    ...room,
    round: nextRound,
    phase: 'challenge-reveal',
    currentChallenge: challenge,
    submissions: {},
    lastVerdict: null,
    timerEndsAt: null,
    players: refreshedPlayers,
    usedChallengeIds: [...usedIds, challenge.id],
  };
}

export function startSubmission(room: GameRoom): GameRoom {
  return {
    ...room,
    phase: 'submission',
    timerEndsAt: Date.now() + room.timerDuration * 1000,
  };
}

export function addSubmission(room: GameRoom, submission: Submission): GameRoom {
  const player = room.players[submission.playerId];
  const updatedPlayers = player
    ? {
        ...room.players,
        [submission.playerId]: {
          ...player,
          hand: player.hand.filter((c) => c.id !== submission.schemeCard?.id),
        },
      }
    : room.players;

  return {
    ...room,
    players: updatedPlayers,
    submissions: {
      ...room.submissions,
      [submission.playerId]: submission,
    },
  };
}

export function applyVerdict(room: GameRoom, verdict: JudgeVerdict): GameRoom {
  const players = { ...room.players };

  // Award points to all ranked players (1st=3, 2nd=2, 3rd=1). A no-winner verdict has
  // empty rankings, so nobody scores and no round win is recorded.
  for (const ranking of verdict.rankings) {
    if (players[ranking.playerId]) {
      players[ranking.playerId] = {
        ...players[ranking.playerId],
        score: players[ranking.playerId].score + ranking.gamePoints + (ranking.bonusPoint ? 1 : 0),
      };
    }
  }

  // Credit the round win to the winner — this is what decides the overall game winner.
  if (!verdict.noWinner && verdict.winnerId && players[verdict.winnerId]) {
    players[verdict.winnerId] = {
      ...players[verdict.winnerId],
      roundsWon: (players[verdict.winnerId].roundsWon ?? 0) + 1,
    };
  }

  return {
    ...room,
    phase: 'winner',
    lastVerdict: verdict,
    players,
  };
}

export function advancePhase(room: GameRoom): GameRoom {
  switch (room.phase) {
    case 'lobby':
      return startRound(room);
    case 'challenge-reveal':
      return startSubmission(room);
    case 'submission':
      return { ...room, phase: 'reveal', timerEndsAt: null };
    case 'reveal':
      return { ...room, phase: 'judging' };
    case 'judging':
      return room; // AI judge handles transition to 'winner'
    case 'winner':
      if (room.round >= room.totalRounds) {
        return { ...room, phase: 'game-over' };
      }
      return { ...room, phase: 'between-rounds' };
    case 'between-rounds':
      return startRound(room);
    default:
      return room;
  }
}

export function addMessage(room: GameRoom, message: ChatMessage): GameRoom {
  const messages = [...room.messages, message].slice(-MAX_CHAT_MESSAGES);
  return { ...room, messages };
}

export function getLeaderboard(room: GameRoom): Player[] {
  return Object.values(room.players).sort((a, b) => b.score - a.score);
}

export function allPlayersSubmitted(room: GameRoom): boolean {
  // Only count players who were present before this round started (exclude mid-round late joiners)
  // Also exclude disconnected players (no heartbeat in the last 45 s) so a dropped phone
  // doesn't permanently stall the submission phase until the timer expires.
  const now = Date.now();
  const activePlayers = Object.values(room.players).filter(
    (p) => p.joinedRound < room.round && (!p.lastSeen || now - p.lastSeen < 45_000),
  );
  return activePlayers.length > 0 && activePlayers.every((p) => room.submissions[p.id]);
}
