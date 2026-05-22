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

// Avatars
export type AvatarId = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9';

// Player & Room
export interface Player {
  id: string;
  name: string;
  avatarId: AvatarId;
  score: number;
  hand: SchemeCard[];
  joinedRound: number;
}

export interface Submission {
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  schemeCard: SchemeCard;
  explanation: string;
  submittedAt: number;
}

// Per-player ranking returned by the AI judge
export interface PlayerRanking {
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  schemeCard: SchemeCard;
  explanation: string;
  judgeScore: number;    // 1–10 score given by judge
  judgeComment: string;  // one-line remark
  gamePoints: number;    // actual points earned this round (1st=3, 2nd=2, 3rd=1)
  bonusPoint: boolean;   // extra point for one-sentence explanation
}

export interface JudgeVerdict {
  winnerId: string;
  winnerName: string;
  schemeCard: SchemeCard;
  explanation: string;
  reasoning: string;       // overall narrative from the judge
  bonusPoint: boolean;
  rankings: PlayerRanking[]; // all players sorted by judgeScore desc
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

export type GameMode = 'crowd' | 'friends';

// Chat
export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  text: string;
  sentAt: number;
}

// Emotes
export type EmoteId = 'masterstroke' | 'aatmanirbhar' | 'vishwaguru' | 'fakir' | 'antinational' | '56inch';

export interface EmoteEvent {
  playerId: string;
  playerName: string;
  avatarId: AvatarId;
  emoteId: EmoteId;
  sentAt: number;
}

export interface GameRoom {
  code: string;
  hostId: string;
  hostName: string;
  phase: GamePhase;
  round: number;
  totalRounds: number;
  timerDuration: number;   // seconds per submission phase
  gameMode: GameMode;
  players: Record<string, Player>;
  currentChallenge: ChallengeCard | null;
  submissions: Record<string, Submission>;
  lastVerdict: JudgeVerdict | null;
  timerEndsAt: number | null;
  cardSetId: string;
  createdAt: number;
  messages: ChatMessage[]; // last 20 chat messages
  usedChallengeIds: string[]; // tracks which challenge cards have been drawn this game
}

// Pusher event map
export type PusherEventMap = {
  'game:room-updated': GameRoom;
  'game:emote': EmoteEvent;
  'game:chat': ChatMessage;
};
