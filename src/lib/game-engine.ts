import type {
  GameRoom,
  GamePhase,
  Player,
  SchemeCard,
  ChallengeCard,
  Submission,
  JudgeVerdict,
} from '@/types/game';
import challengesData from '@/../context/cards_challenges.json';
import schemesData from '@/../context/cards_schemes.json';

const challenges = challengesData as ChallengeCard[];
const schemes = schemesData as SchemeCard[];

const HAND_SIZE = 7;
const DEFAULT_TOTAL_ROUNDS = 5;
const SUBMISSION_TIMER_MS = 90_000;

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion
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

export function createRoom(hostId: string, hostName: string, totalRounds = DEFAULT_TOTAL_ROUNDS): GameRoom {
  const code = generateRoomCode();
  const host: Player = {
    id: hostId,
    name: hostName,
    score: 0,
    hand: dealHand(),
    joinedRound: 0,
  };

  return {
    code,
    hostId,
    phase: 'lobby',
    round: 0,
    totalRounds,
    players: { [hostId]: host },
    currentChallenge: null,
    submissions: {},
    lastVerdict: null,
    timerEndsAt: null,
    cardSetId: 'vikas75',
    createdAt: Date.now(),
  };
}

// Always deals from the full pool — supports 15+ players, allows overlapping hands
export function dealHand(): SchemeCard[] {
  return shuffle([...schemes]).slice(0, HAND_SIZE);
}

export function addPlayer(room: GameRoom, playerId: string, playerName: string): GameRoom {
  return {
    ...room,
    players: {
      ...room.players,
      [playerId]: {
        id: playerId,
        name: playerName,
        score: 0,
        hand: dealHand(),
        joinedRound: room.round,
      },
    },
  };
}

export function startRound(room: GameRoom): GameRoom {
  const nextRound = room.round + 1;
  const usedIds = challenges.slice(0, nextRound - 1).map((c) => c.id);
  const remainingChallenges = challenges.filter((c) => !usedIds.includes(c.id));
  const challenge = shuffle(remainingChallenges)[0];

  return {
    ...room,
    round: nextRound,
    phase: 'challenge-reveal',
    currentChallenge: challenge,
    submissions: {},
    lastVerdict: null,
    timerEndsAt: null,
  };
}

export function startSubmission(room: GameRoom): GameRoom {
  return {
    ...room,
    phase: 'submission',
    timerEndsAt: Date.now() + SUBMISSION_TIMER_MS,
  };
}

export function addSubmission(room: GameRoom, submission: Submission): GameRoom {
  return {
    ...room,
    submissions: {
      ...room.submissions,
      [submission.playerId]: submission,
    },
  };
}

export function applyVerdict(room: GameRoom, verdict: JudgeVerdict): GameRoom {
  const players = { ...room.players };
  if (players[verdict.winnerId]) {
    players[verdict.winnerId] = {
      ...players[verdict.winnerId],
      score: players[verdict.winnerId].score + 2 + (verdict.bonusPoint ? 1 : 0),
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
      return room; // waiting for AI verdict
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

export function getLeaderboard(room: GameRoom): Player[] {
  return Object.values(room.players).sort((a, b) => b.score - a.score);
}

export function allPlayersSubmitted(room: GameRoom): boolean {
  const playerIds = Object.keys(room.players);
  return playerIds.every((id) => room.submissions[id]);
}
