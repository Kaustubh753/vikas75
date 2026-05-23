import type {
  GameRoom,
  GamePhase,
  GameMode,
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
  // No I, O (too similar to 1, 0) — charset matches the validation allowlist in api/game/route.ts
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
  gameMode: GameMode = 'crowd',
): GameRoom {
  return {
    code,
    hostId,
    hostName,
    phase: 'lobby',
    round: 0,
    totalRounds,
    timerDuration,
    gameMode,
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
  settings: { totalRounds?: number; timerDuration?: number; gameMode?: GameMode },
): GameRoom {
  return {
    ...room,
    totalRounds: settings.totalRounds ?? room.totalRounds,
    timerDuration: settings.timerDuration ?? room.timerDuration,
    gameMode: settings.gameMode ?? room.gameMode,
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
        hand: dealHand(),
        joinedRound: room.round,
      },
    },
  };
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
          hand: player.hand.filter((c) => c.id !== submission.schemeCard.id),
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

  // Award points to all ranked players (1st=3, 2nd=2, 3rd=1)
  for (const ranking of verdict.rankings) {
    if (players[ranking.playerId]) {
      players[ranking.playerId] = {
        ...players[ranking.playerId],
        score: players[ranking.playerId].score + ranking.gamePoints + (ranking.bonusPoint ? 1 : 0),
      };
    }
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
  const activePlayers = Object.values(room.players).filter((p) => p.joinedRound < room.round);
  return activePlayers.length > 0 && activePlayers.every((p) => room.submissions[p.id]);
}
