/**
 * Pure logic for the AI judge — no I/O, no SDK, no `@/` path aliases.
 *
 * Everything that decides a round's winner lives here so it can be unit-tested with plain
 * node (`npm run test:judge` imports this file directly through Node's built-in TypeScript
 * type stripping). Keep it "erasable" TypeScript: `import type` only, no enums, no parameter
 * properties, no namespaces. The SDK call, logging and fallback stay in `ai-judge.ts`.
 *
 * Why the judge is built this way — the bias it removes:
 * The old judge listed submissions in submission order, numbered 1..N, with player names, and
 * asked for a score-sorted JSON list with no room to reason first. That is the textbook recipe
 * for an LLM position bias: the fastest submitter was always "1." and won far more often than
 * the quality of their answer justified. The new judge
 *   1. hides identity — players become random `ANS-nn` labels; names, ids and submission
 *      times never reach the model;
 *   2. randomises presentation — one seeded shuffle, and each of the K parallel calls sees a
 *      different rotation of it, so no answer is systematically first;
 *   3. reasons before it scores — per answer the model must write `fit` and `why` before
 *      `judgeScore`, in the order shown, never sorted, then a private `decider` before the
 *      crown;
 *   4. aggregates across calls — the winner is the answer most calls crowned, then mean score,
 *      then mean rank, then a seeded coin (never submission time, never player-id order).
 */
import type { ChallengeCard, JudgeVerdict, PlayerRanking, Submission } from '../types/game';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Fit = 'on-point' | 'stretch' | 'miss';
const FITS: readonly string[] = ['on-point', 'stretch', 'miss'];

export interface LabelledSubmission {
  label: string;
  submission: Submission;
}

/** One judged answer from a single model call. */
export interface CallAnswer {
  label: string;
  fit: Fit;
  why: string;
  judgeComment: string;
  judgeScore: number;
}

/** A structurally valid model call. `order` is the presentation order that call saw. */
export interface CallResult {
  order: string[];
  answers: Map<string, CallAnswer>;
  /** The model's private comparison of the contenders, written before it crowned anyone. */
  decider: string;
  /** The label the model crowned, or null when its pick was not a valid label. */
  winner: string | null;
  reasoning: string;
}

export interface LabelStats {
  label: string;
  meanScore: number;
  firstVotes: number;
  meanRank: number;
  /** Seeded coin for exact dead heats — independent of submission time and player id. */
  tie: number;
}

export interface Aggregate {
  /** Final placement, best first. */
  order: string[];
  stats: Map<string, LabelStats>;
  displayScores: Map<string, number>;
  /** Index of the call whose narrative and comments are shown — it crowned the final winner. */
  consensusIndex: number;
  /** True when first-place votes overrode a runner-up with the higher mean score. */
  pluralityOverride: boolean;
}

// ── Hashing / PRNG ────────────────────────────────────────────────────────────

/** FNV-1a 32-bit. Deterministic across runtimes; plenty for seeding a party game. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a tiny seeded PRNG so every shuffle is reproducible (and testable). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher–Yates with an injected random source. Never `[...].sort(() => Math.random() - 0.5)`:
 * a comparator shuffle is biased toward the input order — which, for submissions, is the
 * order players submitted in.
 */
export function seededShuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Order the local fallback judge's entries: best tier first, uniformly random within a tier.
 *
 * The fallback exists for "no API key, or every live call failed", and it used to crown purely
 * at random. It needn't: two signals are available offline and cost nothing. Whether the played
 * scheme is on the game's own list of schemes that address this challenge, and whether the
 * player wrote anything at all — an auto-submit at timer expiry plays a random card with an
 * empty explanation, and that should never beat someone who actually made a case.
 *
 * A shuffle FIRST, then a stable sort by tier, is what keeps the debiasing intact: within a
 * tier the order is uniformly random, and the tier itself is a function of the card id and the
 * explanation text — never of submission order or player id. (`Array.prototype.sort` is
 * required to be stable, so the shuffle's order survives inside each tier.)
 */
export function rankFallback<T>(entries: readonly T[], rand: () => number, tierOf: (item: T) => number): T[] {
  return seededShuffle(entries, rand).sort((a, b) => tierOf(b) - tierOf(a));
}

// ── Labels & presentation orders ──────────────────────────────────────────────

/**
 * Labels are `ANS-nn` with nn drawn from 10–99: no ordering cue (unlike A/B/C), and one regex
 * catches every way the model could echo one on screen without touching "Plan B" or "Vitamin C".
 */
export const LABEL_POOL_SIZE = 90;
/** Matches a label however the model might write it back: ANS-42, ans-42, ANS 42, ANS–42, ANS_42. */
const LABEL_RE_SOURCE = 'ANS[\\s\\-\\u2010-\\u2015_]?\\d\\d';
/** Canonical form of any LABEL_RE_SOURCE match. */
const canonLabel = (raw: string) => `ANS-${raw.slice(-2)}`;
/** The same tolerance, anchored — for deciding whether a whole field IS a label. */
const LABEL_EXACT_RE = new RegExp(`^${LABEL_RE_SOURCE}$`, 'i');

export function drawLabels(n: number, rand: () => number): string[] {
  if (n > LABEL_POOL_SIZE) throw new Error(`${n} answers exceed the ${LABEL_POOL_SIZE}-label pool`);
  const pool = Array.from({ length: LABEL_POOL_SIZE }, (_, i) => 10 + i);
  return seededShuffle(pool, rand)
    .slice(0, n)
    .map((nn) => `ANS-${nn}`);
}

/**
 * The round's seed depends only on the challenge and the SET of players — not on who
 * submitted first — so labels, presentation orders and the tie-break coin are all
 * independent of submission time. It is also stable across a kick-judge re-fire.
 */
export function roundSeed(challengeId: string, submissions: readonly Submission[]): number {
  const ids = submissions.map((s) => s.playerId).sort();
  return fnv1a32(`${challengeId}|${ids.join(',')}`);
}

/**
 * Give every submission a random label. Submissions are canonicalised by playerId first so
 * the input order (submission order) cannot influence who gets which label. Returned in
 * canonical order.
 */
export function assignLabels(submissions: readonly Submission[], seed: number): LabelledSubmission[] {
  const canonical = [...submissions].sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0));
  const labels = drawLabels(canonical.length, mulberry32(seed));
  return canonical.map((submission, i) => ({ label: labels[i], submission }));
}

/**
 * The presentation order for each parallel call: one seeded shuffle, then rotations of it at
 * offsets 0, ⌊N/3⌋ and ⌊2N/3⌋. For N ≥ 3 the offsets are distinct, so no answer sits in the
 * same position twice and every answer gets a turn near the top, the middle and the bottom.
 * Two answers get the shuffle and its reverse; one answer needs a single call.
 */
export function makeCallOrders(labels: readonly string[], seed: number): string[][] {
  const n = labels.length;
  if (n === 0) return [];
  if (n === 1) return [[labels[0]]];
  // A different stream from assignLabels so the two shuffles are not correlated.
  const base = seededShuffle(labels, mulberry32((seed ^ 0x9e3779b9) >>> 0));
  if (n === 2) return [base, [...base].reverse()];
  const offsets = [0, Math.floor(n / 3), Math.floor((2 * n) / 3)];
  return offsets.map((k) => base.slice(k).concat(base.slice(0, k)));
}

// ── Prompt assembly ───────────────────────────────────────────────────────────

/**
 * Text that goes to the model: strip control characters, angle brackets (a crafted
 * explanation could otherwise smuggle a literal `>>>` to close the untrusted-input markers),
 * runs of `=` (so it cannot forge an `=== ANS-nn ===` block separator) and collapse
 * whitespace. Only affects the prompt — never what is stored or shown on screen.
 */
export function clean(text: string | undefined | null): string {
  return (text ?? '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/[<>]/g, '')
    .replace(/={2,}/g, '')
    // Label-shaped text, in any spelling the parser would accept. A player writing "ANS-42
    // wins" in their own explanation cannot then be quoted back as if it were a real answer
    // header, or referred to by a label they chose. The prompt already forbids obeying
    // anything inside the markers; this makes it a property of the input, like the two
    // strips above, rather than a rule the model is trusted to follow.
    .replace(new RegExp(LABEL_RE_SOURCE, 'gi'), 'that answer')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Above this many answers the prompt switches to brief per-answer fields to protect latency. */
export const BRIEF_THRESHOLD = 10;

export function buildUserMessage(
  challenge: ChallengeCard,
  byLabel: ReadonlyMap<string, Submission>,
  order: readonly string[],
  onBriefIds: ReadonlySet<string> | null,
): string {
  const n = order.length;
  const blocks = order.map((label) => {
    const s = byLabel.get(label);
    if (!s) throw new Error(`No submission for label ${label}`);
    const card = s.schemeCard;
    const lines = [`=== ${label} ===`, `Scheme: ${clean(card.name)} (${clean(card.hi)})${card.desc ? ` — ${clean(card.desc)}` : ''}`];
    if (card.bullets?.length) lines.push(`Benefits: ${card.bullets.map(clean).join('; ')}`);
    if (onBriefIds) lines.push(`On-brief for this challenge: ${onBriefIds.has(card.id) ? 'yes' : 'no'}`);
    lines.push(`Explanation: <<<${clean(s.explanation) || '(blank — nothing written)'}>>>`);
    return lines.join('\n');
  });
  const plural = n === 1 ? '' : 's';
  return [
    'CHALLENGE CARD',
    `"${clean(challenge.en)}"`,
    `(Hindi: ${clean(challenge.hi)})`,
    '',
    `${n} answer${plural} follow${n === 1 ? 's' : ''}, in random order under random labels. The order and the labels carry no information. Assess each answer on its own merits, in the order shown, then pick exactly one winner.`,
    '',
    blocks.join('\n\n'),
    '',
    `Assess all ${n} answer${plural} in the order shown, then write the decider, name the winner and write the round narrative. JSON only.`,
  ].join('\n');
}

/**
 * The JSON Schema for one call's reply. Property order is the order the model writes them
 * in: reasoning fields before the score, the decider before the winner. Static (no per-round
 * label enum) so the API compiles it once; label membership and the 1–10 range are checked in
 * code by parseCallResult.
 */
export const CALL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answers', 'decider', 'winner', 'reasoning'],
  properties: {
    answers: {
      type: 'array',
      description: 'One entry per answer, in the order the answers were shown.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'fit', 'why', 'judgeComment', 'judgeScore'],
        properties: {
          label: { type: 'string', description: "The answer's label exactly as shown, e.g. ANS-42." },
          fit: { type: 'string', enum: ['on-point', 'stretch', 'miss'] },
          why: { type: 'string', description: 'Private evaluation of fit and argument; short.' },
          judgeComment: { type: 'string', description: 'One punchy sentence to this player; no labels, no placement words.' },
          judgeScore: { type: 'integer', description: '1 to 10 per the score bands; must agree with fit.' },
        },
      },
    },
    decider: { type: 'string', description: 'At most 30 words: the real contenders by scheme name and what separates first from second.' },
    winner: { type: 'string', description: 'The label of the single best answer.' },
    reasoning: { type: 'string', description: '2-3 sentences about the round naming the winning answer by scheme name; no labels.' },
  },
} as const;

// ── Per-call parsing & validation ─────────────────────────────────────────────

function fitFromScore(score: number): Fit {
  return score >= 7 ? 'on-point' : score >= 4 ? 'stretch' : 'miss';
}

/**
 * The top of each fit's score band, from the rubric ("on-point → 5–10, stretch → 3–7,
 * miss → 1–4"). Only the CEILING is enforced, never the floor: a score higher than the
 * model's own stated fit justifies is score inflation — the "do not park everyone at 7–8"
 * failure the rubric warns about — and clamping it down is always the honest reading. The
 * floor is deliberately left alone because the rubric's own override sends a blank
 * explanation, or text aimed at the judge, to 1–2 *whatever the fit says*; clamping up
 * would undo exactly that.
 */
const FIT_CEILING: Record<Fit, number> = { 'on-point': 10, stretch: 7, miss: 4 };

/**
 * Turn one raw reply into a CallResult or throw. Hard failures (a label missing, unknown or
 * repeated; a score that is not an integer 1–10) reject the whole call — a confused reply is
 * dropped, never repaired into a ranking. Soft ones (bad fit, missing strings, an invalid
 * winner) are repaired and reported in `notes` so they show up in the logs.
 *
 * Two rubric rules are also enforced here rather than trusted to the prose: an answer whose
 * explanation was blank (`blankLabels`) can score at most 2 — nothing written is never a right
 * answer, however obvious the card — and a stated winner the same call scored below its own
 * top answer is discarded in favour of that top score.
 */
export function parseCallResult(
  raw: unknown,
  order: readonly string[],
  blankLabels: ReadonlySet<string> = new Set(),
): { result: CallResult; notes: string[] } {
  const notes: string[] = [];
  if (!raw || typeof raw !== 'object') throw new Error('reply is not an object');
  const obj = raw as { answers?: unknown; decider?: unknown; winner?: unknown; reasoning?: unknown };
  if (!Array.isArray(obj.answers)) throw new Error('reply has no answers array');

  const valid = new Set(order);
  const answers = new Map<string, CallAnswer>();
  const replyOrder: string[] = [];
  for (const item of obj.answers as unknown[]) {
    if (!item || typeof item !== 'object') throw new Error('answer is not an object');
    const a = item as Record<string, unknown>;
    // Accept every spelling `scrubLabels` tolerates ("ANS 42", "ANS_42", "ANS\u201142"), not just
    // the exact one. A hard throw here drops the WHOLE call — a third of the panel — so a
    // formatting slip in one field used to cost a real vote. The canonical form must still be
    // one of this call's own labels, so nothing loosens about which answers are valid.
    const rawLabel = typeof a.label === 'string' ? a.label.trim() : '';
    const label = LABEL_EXACT_RE.test(rawLabel) ? canonLabel(rawLabel) : rawLabel.toUpperCase();
    if (!valid.has(label)) throw new Error(`unknown label ${JSON.stringify(a.label)}`);
    replyOrder.push(label);
    if (answers.has(label)) throw new Error(`duplicate label ${label}`);
    const score = a.judgeScore;
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 10) {
      throw new Error(`invalid judgeScore ${JSON.stringify(score)} for ${label}`);
    }
    let fit: Fit;
    if (typeof a.fit === 'string' && FITS.includes(a.fit)) fit = a.fit as Fit;
    else {
      fit = fitFromScore(score);
      notes.push(`fit for ${label} coerced from score`);
    }
    const why = typeof a.why === 'string' ? a.why : '';
    if (!why) notes.push(`empty why for ${label}`);
    const judgeComment = typeof a.judgeComment === 'string' ? a.judgeComment : '';
    if (!judgeComment) notes.push(`empty comment for ${label}`);
    let judgeScore = score;
    // The rubric's fit↔score bands, enforced rather than merely asked for. A call that writes
    // "miss" and then scores it 9 has contradicted itself between two fields it wrote in that
    // order; the fit came first and is the less anchored of the two, so the score yields to it.
    // A no-op when `fit` was coerced above (it is derived from the score, so it always agrees).
    const ceiling = FIT_CEILING[fit];
    if (judgeScore > ceiling) {
      notes.push(`${label} scored ${judgeScore} above the ${fit} ceiling ${ceiling}; clamped`);
      judgeScore = ceiling;
    }
    if (blankLabels.has(label) && judgeScore > 2) {
      notes.push(`blank explanation for ${label} scored ${judgeScore}; clamped to 2`);
      judgeScore = 2;
    }
    answers.set(label, { label, fit, why, judgeComment, judgeScore });
  }
  if (answers.size < order.length) {
    const missing = order.filter((l) => !answers.has(l));
    throw new Error(`missing label(s) ${missing.join(',')}`);
  }
  // The prompt requires the answers back "in the order the answers were shown", because a
  // reply that re-sorts them — score-descending, say — is the model ranking before it reasons,
  // which is the exact habit the whole debiased design exists to break (bug #22). It is not
  // worth dropping a call over, and the scores are still usable, but it must not pass silently:
  // this note is the only thing that would make the regression visible in the logs.
  if (replyOrder.some((l, i) => l !== order[i])) notes.push('answers returned out of the shown order');

  let winner: string | null = null;
  const rawWinner = typeof obj.winner === 'string' ? obj.winner.trim() : '';
  const winnerLabel = LABEL_EXACT_RE.test(rawWinner) ? canonLabel(rawWinner) : rawWinner.toUpperCase();
  if (valid.has(winnerLabel)) {
    winner = winnerLabel;
    const top = Math.max(...[...answers.values()].map((x) => x.judgeScore));
    const own = answers.get(winner)!.judgeScore;
    if (own < top) {
      notes.push(`winner ${winner} scored ${own} below the call's top ${top}; using top score`);
      winner = null;
    }
  } else {
    notes.push(`invalid winner ${JSON.stringify(obj.winner)}`);
  }
  const decider = typeof obj.decider === 'string' ? obj.decider : '';
  if (!decider) notes.push('empty decider');
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : '';
  if (!reasoning) notes.push('empty reasoning');

  return { result: { order: [...order], answers, decider, winner, reasoning }, notes };
}

// ── Aggregation across calls ──────────────────────────────────────────────────

/** 1-based rank within one call; equal scores share the average of their positions. */
function withinCallRanks(call: CallResult, labels: readonly string[]): Map<string, number> {
  const sorted = [...labels].sort((a, b) => call.answers.get(b)!.judgeScore - call.answers.get(a)!.judgeScore);
  const ranks = new Map<string, number>();
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    const score = call.answers.get(sorted[i])!.judgeScore;
    while (j + 1 < sorted.length && call.answers.get(sorted[j + 1])!.judgeScore === score) j++;
    const avg = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) ranks.set(sorted[k], avg);
    i = j + 1;
  }
  return ranks;
}

function tieCoin(seed: number, label: string): number {
  return fnv1a32(`${seed}:${label}`);
}

/** The label one call crowned: its stated winner, else its top score (coin on ties). */
export function callTopVote(call: CallResult, seed: number): string {
  if (call.winner) return call.winner;
  return [...call.answers.keys()].sort(
    (a, b) => call.answers.get(b)!.judgeScore - call.answers.get(a)!.judgeScore || tieCoin(seed, a) - tieCoin(seed, b),
  )[0];
}

/** 1-based position of the call's top vote in the order that call saw — the residual-primacy metric. */
export function topVotePosition(call: CallResult, seed: number): number {
  return call.order.indexOf(callTopVote(call, seed)) + 1;
}

/**
 * Combine K validated calls into one placement.
 *   winner : most first-place votes → mean score → mean rank → seeded coin
 *   rest   : mean score → mean rank → first-place votes → seeded coin
 * Every key is order-independent: shuffling the calls, or the order each call saw, cannot
 * change the result, and neither submission time nor player id is ever a key.
 */
export function aggregateCalls(calls: readonly CallResult[], labels: readonly string[], seed: number): Aggregate {
  if (!calls.length) throw new Error('no valid calls to aggregate');
  if (!labels.length) throw new Error('no labels');
  const k = calls.length;

  const ranksPerCall = calls.map((c) => withinCallRanks(c, labels));
  const topVotes = calls.map((c) => callTopVote(c, seed));

  const stats = new Map<string, LabelStats>();
  for (const label of labels) {
    let sum = 0;
    let rankSum = 0;
    for (let i = 0; i < k; i++) {
      const a = calls[i].answers.get(label);
      const r = ranksPerCall[i].get(label);
      if (!a || r === undefined) throw new Error(`call ${i} has no answer for ${label}`);
      sum += a.judgeScore;
      rankSum += r;
    }
    stats.set(label, {
      label,
      meanScore: sum / k,
      firstVotes: topVotes.filter((v) => v === label).length,
      meanRank: rankSum / k,
      tie: tieCoin(seed, label),
    });
  }

  const byWinnerKeys = (a: LabelStats, b: LabelStats) =>
    b.firstVotes - a.firstVotes || b.meanScore - a.meanScore || a.meanRank - b.meanRank || a.tie - b.tie;
  const byRestKeys = (a: LabelStats, b: LabelStats) =>
    b.meanScore - a.meanScore || a.meanRank - b.meanRank || b.firstVotes - a.firstVotes || a.tie - b.tie;

  const all = [...stats.values()];
  const winner = [...all].sort(byWinnerKeys)[0];
  const rest = all.filter((s) => s.label !== winner.label).sort(byRestKeys);
  const order = [winner.label, ...rest.map((s) => s.label)];

  // Stars shown on screen: the mean to one decimal, and the winner never displays below the
  // runner-up (the one case where plurality can beat a higher mean) so the list reads monotone.
  const display = (v: number) => Math.max(1, Math.min(10, Math.round(v * 10) / 10));
  const displayScores = new Map<string, number>(all.map((s) => [s.label, display(s.meanScore)]));
  const runnerUp = rest[0];
  const pluralityOverride = !!runnerUp && runnerUp.meanScore > winner.meanScore;
  if (pluralityOverride) displayScores.set(winner.label, displayScores.get(runnerUp.label)!);

  // The narrative must agree with the crown: only calls that picked the final winner qualify,
  // and among them the one whose own ranking is closest to the final order (Spearman footrule).
  // The winner always holds at least one vote (the K votes are spread over the labels), so
  // such a call always exists.
  const finalPos = new Map(order.map((l, i) => [l, i + 1]));
  let consensusIndex = -1;
  let best = Infinity;
  for (let i = 0; i < k; i++) {
    if (topVotes[i] !== winner.label) continue;
    let dist = 0;
    for (const label of labels) dist += Math.abs(ranksPerCall[i].get(label)! - finalPos.get(label)!);
    if (dist < best) {
      best = dist;
      consensusIndex = i;
    }
  }
  if (consensusIndex < 0) throw new Error('no call crowned the aggregate winner');

  return { order, stats, displayScores, consensusIndex, pluralityOverride };
}

// ── On-screen text hygiene ────────────────────────────────────────────────────

const LABEL_WORD_RE = new RegExp(`\\b(?:answer|player|entry|submission)s?\\s+(?=${LABEL_RE_SOURCE})`, 'gi');
const LABEL_RE = new RegExp(`#?\\(?\\b(${LABEL_RE_SOURCE})\\b\\)?`, 'gi');
// "answer 42" / "entry #42" — the label's number without its prefix; swapped only if it is a live label.
const BARE_NUMBER_RE = /\b(?:answer|entry|submission)\s+#?(\d\d)\b/gi;
const PLAYER_RE = /\bplayers?\s+#?\d+\b/gi;
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\([^)]*\)/g;

/**
 * Labels are prompt plumbing, never UI text. The prompt forbids them in comments and
 * reasoning; this is the backstop that swaps a stray "ANS-42" (in any casing or spelling
 * the parser would also accept) for "the <scheme> answer". Also strips the untrusted-input
 * markers and stray markdown — the projector renders plain text. `counter.count`
 * accumulates the number of label substitutions for the logs.
 */
export function scrubLabels(text: string, schemeByLabel: ReadonlyMap<string, string>, counter?: { count: number }): string {
  const swap = (label: string) => {
    if (counter) counter.count++;
    const scheme = schemeByLabel.get(canonLabel(label));
    return scheme ? `the ${scheme} answer` : 'this answer';
  };
  let out = (text ?? '')
    .replace(/<<<|>>>/g, '')
    .replace(LABEL_WORD_RE, '')
    .replace(LABEL_RE, (_whole, label: string) => swap(label))
    .replace(BARE_NUMBER_RE, (whole, nn: string) => (schemeByLabel.has(`ANS-${nn}`) ? swap(nn) : whole))
    .replace(PLAYER_RE, 'this answer')
    .replace(MARKDOWN_LINK_RE, '$1')
    .replace(/[*`_~#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Unreachable after the regexes above; kept as a guard so a label can never reach the screen.
  if (new RegExp(LABEL_RE_SOURCE, 'i').test(out)) out = out.replace(new RegExp(LABEL_RE_SOURCE, 'gi'), 'this answer');
  return out;
}

/**
 * Cut over-long model text at the last sentence end before `max` (English or Devanagari
 * punctuation); mark the cut with an ellipsis. Never splits a surrogate pair — a cut inside an
 * emoji would render as � on the projector.
 */
export function capText(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max).replace(/[\uD800-\uDBFF]$/, '');
  const cut = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('\u0964 '));
  return (cut > max * 0.4 ? head.slice(0, cut + 1) : head.trimEnd()) + '…';
}

const NEUTRAL_COMMENT: Record<Fit, string> = {
  'on-point': 'On point — the scheme actually does this.',
  stretch: 'A stretch, but the connection lands.',
  miss: "Fun, but the scheme doesn't do that.",
};

const COMMENT_MAX = 200;
const REASONING_MAX = 600;

// ── Final verdict ─────────────────────────────────────────────────────────────

/**
 * Build the JudgeVerdict shown on screen. Identity fields (name, avatar, card, explanation)
 * are copied from the server's own Submission objects — nothing the model wrote becomes an
 * identity. Throws if the aggregate is not a complete, consistent placement.
 */
export function assembleVerdict(
  agg: Aggregate,
  calls: readonly CallResult[],
  labelled: readonly LabelledSubmission[],
  counter?: { count: number },
): JudgeVerdict {
  const byLabel = new Map(labelled.map((l) => [l.label, l.submission]));
  const schemeByLabel = new Map(labelled.map((l) => [l.label, l.submission.schemeCard.name]));
  const consensus = calls[agg.consensusIndex];
  if (!consensus) throw new Error('consensus call missing');
  if (agg.order.length !== labelled.length || new Set(agg.order).size !== labelled.length) {
    throw new Error('aggregate does not place every player exactly once');
  }

  const rankings: PlayerRanking[] = agg.order.map((label, i) => {
    const sub = byLabel.get(label);
    const stat = agg.stats.get(label);
    const own = consensus.answers.get(label);
    if (!sub || !stat || !own) throw new Error(`no submission/stats/answer for label ${label}`);
    // One voice for the table — the consensus call — unless its score for this answer sits
    // far from the mean, in which case a comment written for a 3 would sit beside 4 stars.
    let source = own;
    if (Math.abs(own.judgeScore - stat.meanScore) >= 3) {
      source = calls
        .map((c) => c.answers.get(label)!)
        .reduce((bestSoFar, a) => (Math.abs(a.judgeScore - stat.meanScore) < Math.abs(bestSoFar.judgeScore - stat.meanScore) ? a : bestSoFar), own);
    }
    const comment = capText(scrubLabels(source.judgeComment, schemeByLabel, counter), COMMENT_MAX) || NEUTRAL_COMMENT[own.fit];
    return {
      playerId: sub.playerId,
      playerName: sub.playerName,
      avatarId: sub.avatarId,
      schemeCard: sub.schemeCard,
      explanation: sub.explanation,
      judgeScore: agg.displayScores.get(label)!,
      judgeComment: comment,
      gamePoints: i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0,
    };
  });

  for (let i = 1; i < rankings.length; i++) {
    if (rankings[i].judgeScore > rankings[i - 1].judgeScore) throw new Error('display scores are not monotone');
  }
  const winner = rankings[0];
  const reasoning =
    capText(scrubLabels(consensus.reasoning, schemeByLabel, counter), REASONING_MAX) ||
    `The ${winner.schemeCard.name} answer took the round — ${winner.judgeComment}`;

  return {
    winnerId: winner.playerId,
    winnerName: winner.playerName,
    schemeCard: winner.schemeCard,
    explanation: winner.explanation,
    reasoning,
    rankings,
  };
}

// ── Budgets & API error classification ────────────────────────────────────────

/** TTL of `lock:judging:` in route.ts. The judge must always finish well inside it. */
export const JUDGING_LOCK_TTL_MS = 30_000;

/**
 * One absolute deadline for the whole fan-out (and for the plain-JSON retry if structured
 * outputs are rejected). Output tokens are the slow part (~70/s) and the reply grows with the
 * table, so the budget grows with it — but never past 22 s, which with Redis and the
 * broadcast keeps triggerJudge inside the 30 s lock.
 *
 * The per-answer slack is 900 ms, not the 650 ms it started at, because 650 did not keep up
 * with the reply it was budgeting for. A full-mode answer costs roughly 65–90 output tokens,
 * i.e. ~1.0–1.3 s each at 70 tok/s, so the budget was falling behind by ~350 ms per player
 * and the squeeze landed hardest at 8–10 answers — full mode (brief only engages above 10)
 * with the least headroom. That matters more than a dropped call usually would: all K calls
 * share ONE deadline and do an identically sized job, so missing it is a *correlated*
 * failure — every call drops together, `judgeRound` catches, and the round is decided by
 * `fallbackJudge`, i.e. at random, at exactly the table sizes a real venue fills. 900 ms
 * per answer restores the margin (~65–70% of the budget used at 8–10) while the 22 s cap,
 * and therefore the lock-TTL invariant, is untouched.
 */
export function deadlineMsFor(n: number): number {
  return Math.min(22_000, 9_000 + 900 * n);
}

/**
 * Cap on the reply, not a target: about 130 tokens per answer in full mode (fit, an ≤18-word
 * why, an ≤12-word comment, score, keys) or 90 in brief mode, plus the decider, winner and
 * narrative. Sized for Sonnet 5's tokenizer (~30% more tokens for the same text than the
 * 4.x generation) with roughly 1.5–2× the expected reply, so hitting the cap is a genuine
 * failure signal, and generous caps cost nothing — the deadline is the real bound.
 */
export function maxTokensFor(n: number): number {
  const perAnswer = n > BRIEF_THRESHOLD ? 90 : 130;
  return Math.min(3600, 500 + n * perAnswer);
}

/**
 * True only for the one 400 that means "this model does not take output_config" — the signal
 * to degrade to plain JSON. Any other 400 (bad model id, malformed request) stays a dropped call.
 */
export function isStructuredOutputRejection(err: unknown): boolean {
  const e = err as { status?: unknown; message?: unknown } | null;
  return !!e && e.status === 400 && /output_config|json_schema|output.?format|structured/i.test(String(e.message ?? ''));
}
