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
export type AvatarId = 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8' | 'a9' | 'a10' | 'a11';

// Player & Room
export interface Player {
  id: string;
  name: string;
  avatarId: AvatarId;
  score: number;
  roundsWon: number; // count of rounds this player won (1st place) — decides the overall winner
  hand: SchemeCard[];
  joinedRound: number;
  lastSeen?: number; // epoch ms — set on join, updated via heartbeat every 20 s
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
  noWinner?: boolean;      // true = explicit "no winner this round" (judge failed / no submissions); rankings empty, no points awarded
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
  emote: EmoteId;       // matches the field name sent by POST /api/game { action: 'emote' }
  timestamp: number;    // matches the field name sent by the server
}

export interface GameRoom {
  code: string;
  hostId: string;
  hostName: string;
  /** Per-player secret tokens (playerId → token), issued at join. Server-side only —
   *  stripped from every client-facing payload. Used to authenticate state-changing
   *  actions and own-hand reads so a player can't impersonate or read another's hand. */
  tokens?: Record<string, string>;
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
  shutdownAt?: number;    // epoch ms — set when ≤1 player active; room deleted after this passes
  rev?: number;           // monotonic write counter, bumped on every setRoom; clients drop
                          // any snapshot older than what they already have (stale-poll guard)
}

// Pusher event map — event names must match server triggers in api/game/route.ts exactly
export type PusherEventMap = {
  'game:room-updated': GameRoom;
  'emote': EmoteEvent;        // NOTE: emote fires without 'game:' prefix (see route.ts emote handler)
  'game:chat': ChatMessage;
  'music:toggle': { muted: boolean };
};
