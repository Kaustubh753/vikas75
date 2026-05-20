// Card types
export interface ChallengeCard {
  id: string;
  en: string;
  hi: string;
  icon: string;
}

export interface SchemeCard {
  id: string;
  name: string;
  hi: string;
  desc: string;
  bullets: string[];
}

// Player & Room
export interface Player {
  id: string;
  name: string;
  score: number;
  hand: SchemeCard[];
  joinedRound: number;
}

export interface Submission {
  playerId: string;
  playerName: string;
  schemeCard: SchemeCard;
  explanation: string;
  submittedAt: number;
}

export interface JudgeVerdict {
  winnerId: string;
  winnerName: string;
  schemeCard: SchemeCard;
  explanation: string;
  reasoning: string;
  bonusPoint: boolean;
}

export type GamePhase =
  | 'lobby'
  | 'challenge-reveal'
  | 'submission'
  | 'reveal'
  | 'judging'
  | 'winner'
  | 'between-rounds'
  | 'game-over';

export interface GameRoom {
  code: string;
  hostId: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  players: Record<string, Player>;
  currentChallenge: ChallengeCard | null;
  submissions: Record<string, Submission>;
  lastVerdict: JudgeVerdict | null;
  timerEndsAt: number | null;
  cardSetId: string;
  createdAt: number;
}

// Pusher event payloads
export interface PusherEvent {
  type: string;
  payload: unknown;
}

export type PusherEventMap = {
  'game:room-updated': GameRoom;
  'game:player-joined': { player: Player };
  'game:player-submitted': { playerId: string; playerName: string };
  'game:phase-changed': { phase: GamePhase; room: GameRoom };
  'game:verdict': { verdict: JudgeVerdict; room: GameRoom };
};
