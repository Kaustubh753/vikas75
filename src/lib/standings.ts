// The single source of truth for "who is winning" — used by every surface that shows a table
// of players (projector between-rounds and game-over, the player's phone leaderboard and
// game-over, the mobile host's compact view, and the shared result card).
//
// It exists because these surfaces had drifted apart. The between-rounds boards sorted on
// `score` alone while the game-over boards sorted on `roundsWon` first — but ROUND WINS, not
// points, decide the game (see `applyVerdict` in game-engine.ts). So the standings the room
// watched all game could name a different leader than the podium that ended it, with nothing
// in between to explain the swap. One ranking, computed once, keeps every screen honest.

/** The shape this module needs. `Player` satisfies it; so does the share card's row type. */
export interface Rankable {
  id: string;
  score: number;
  /** Optional only for legacy rooms written before the field existed — treated as 0. */
  roundsWon?: number;
}

export interface Standings<P extends Rankable> {
  /** Best first. */
  players: P[];
  /** Competition rank, parallel to `players`: players who are level share a place (1,1,3,…). */
  ranks: number[];
  /** Everyone level with the leader — more than one means a genuine dead heat. Empty until someone scores. */
  leaders: P[];
  /** True once anybody has won a round or scored a point. */
  hasLead: boolean;
  /** True when the lead is real AND shared: joint champions rather than an id-tiebreak crown. */
  tied: boolean;
  /** Is this player level with the leader? False for everyone while the game is still goalless. */
  isLeader(p: Rankable): boolean;
  /** 1-based competition place, or 0 when the id isn't playing. */
  placeOf(id: string): number;
}

const wins = (p: Rankable) => p.roundsWon ?? 0;
const level = (a: Rankable, b: Rankable) => wins(a) === wins(b) && a.score === b.score;

/**
 * Rank players by the game's own winning rule: most rounds won, then total points, then a
 * stable id tiebreak so the order never depends on object insertion order.
 *
 * The id tiebreak orders the list but must never be read as a *result*: two players it
 * separates are still level, which is why `leaders`/`tied` compare on (roundsWon, score) only.
 */
export function rankPlayers<P extends Rankable>(players: Iterable<P>): Standings<P> {
  const sorted = [...players].sort(
    (a, b) => wins(b) - wins(a) || b.score - a.score || a.id.localeCompare(b.id),
  );

  const ranks = sorted.map((p, i) => (i > 0 && level(sorted[i - 1], p) ? -1 : i + 1));
  for (let i = 1; i < ranks.length; i++) if (ranks[i] === -1) ranks[i] = ranks[i - 1];

  const top = sorted[0];
  // An all-zero washout — every round a no-winner — is not a tie to celebrate, so no one
  // leads until someone has actually put something on the board.
  const hasLead = !!top && (wins(top) > 0 || top.score > 0);
  const leaders = hasLead ? sorted.filter((p) => level(p, top)) : [];

  return {
    players: sorted,
    ranks,
    leaders,
    hasLead,
    tied: leaders.length > 1,
    isLeader: (p) => hasLead && level(p, top),
    placeOf: (id) => {
      const i = sorted.findIndex((p) => p.id === id);
      return i < 0 ? 0 : ranks[i];
    },
  };
}
