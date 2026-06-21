import type { ChallengeCard, Submission, JudgeVerdict, PlayerRanking } from '@/types/game';

// The single hardcoded model string for the judge call.
const JUDGE_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are the AI Judge for Vikas 75, a game show about Indian government schemes.
Your job is to rank ALL answers from best to worst, give each a score from 1 to 10, then crown
exactly ONE winner: the single highest-scored answer. Never declare a tie for first place.

Reward creativity, wit, and surprising or funny connections OVER dry technical correctness.
A clever, unexpected, or hilarious justification must beat a boring-but-accurate one every time.

Scoring priority (highest to lowest):
1. Innovative + funny connection (jugaad thinking rewarded)
2. Unexpected but valid
3. Technically correct but interesting
4. Boring but accurate (caps out at 4–5)

Personality: sharp, witty game show host energy. Enthusiastic, occasionally sarcastic, always entertaining.
Accept Hinglish fully. Reward creativity in any language.
Keep each judgeComment to one punchy sentence.
The reasoning field is 2–3 sentences overall narrative about the round.

Bonus point (bonusPoint: true): if the explanation is a single sentence or less.

You must respond with valid JSON only, no markdown fences, exactly this format:
{
  "rankings": [
    { "playerId": "<exact playerId>", "judgeScore": 9, "judgeComment": "<one line>", "bonusPoint": false },
    ...
  ],
  "reasoning": "<2–3 sentence narrative about the round>"
}

Rankings must include every player, sorted by judgeScore descending.`;

const FALLBACK_VERDICTS = [
  "The judges have deliberated — this scheme wins for sheer jugaad! Sometimes the most unexpected connection is the most brilliant one. The crowd agrees!",
  "Out of all the answers, this one made us do a double-take — in the best possible way. Pure desi ingenuity on display here!",
  "Listen, we've seen thousands of schemes, but connecting it THIS way? Ek number! The audience is on their feet.",
  "This answer had the whole panel laughing AND nodding. That's the rarest combo in Vikas 75 history!",
  "Bold. Creative. Slightly unhinged. Exactly what we reward here. Badhaai ho to our winner!",
  "When life gives you a scheme, this player made chai, samosa, AND biryani out of it. Masterclass.",
  "The AI judge was genuinely surprised. That doesn't happen often. Well played!",
  "Other answers were good. This one was great. The difference? Pure Bharat ki creativity!",
];

const FALLBACK_COMMENTS = [
  "Ekdum mast connection!",
  "Solid but could've gone wilder.",
  "Safe choice, well argued.",
  "The crowd appreciated this one.",
  "Textbook answer — needs more masala.",
  "Decent attempt, but judges wanted more jugaad.",
  "Hmm. The logic is there if you squint.",
  "Points for confidence alone.",
];

async function claudeJudge(challenge: ChallengeCard, submissions: Submission[]): Promise<JudgeVerdict> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const submissionsText = submissions
    .map(
      (s, i) =>
        `${i + 1}. Player: ${s.playerName} (id: ${s.playerId})\n   Scheme: ${s.schemeCard.name} (${s.schemeCard.hi})\n   Explanation: "${s.explanation}"`
    )
    .join('\n\n');

  const userMessage = `Challenge Card:\n"${challenge.en}"\n(Hindi: ${challenge.hi})\n\nSubmissions:\n${submissionsText}\n\nRank all players. Respond with JSON only.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000); // 8s hard cap — on timeout we fall back to local judging
  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create(
      {
        model: JUDGE_MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
  console.log(`[ai-judge] Live verdict via ${JUDGE_MODEL} (${text.length} chars)`);
  const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(json) as {
    rankings: Array<{ playerId: string; judgeScore: number; judgeComment: string; bonusPoint: boolean }>;
    reasoning: string;
  };

  return buildVerdict(submissions, parsed.rankings, parsed.reasoning);
}

function buildVerdict(
  submissions: Submission[],
  rankingsRaw: Array<{ playerId: string; judgeScore: number; judgeComment: string; bonusPoint: boolean }>,
  reasoning: string,
): JudgeVerdict {
  // Validate Claude ranked every submitted player, no unknown IDs, and scores are valid numbers
  const submissionIds = new Set(submissions.map((s) => s.playerId));
  // Dedupe by playerId (keep first occurrence) — a malformed response that lists the same
  // player twice must never score them twice.
  const seen = new Set<string>();
  const deduped = rankingsRaw.filter((r) => {
    if (seen.has(r.playerId)) return false;
    seen.add(r.playerId);
    return true;
  });
  for (const r of deduped) {
    if (!submissionIds.has(r.playerId)) throw new Error(`Unknown player ${r.playerId} in rankings`);
    if (typeof r.judgeScore !== 'number' || isNaN(r.judgeScore) || r.judgeScore < 1 || r.judgeScore > 10) {
      throw new Error(`Invalid judgeScore ${r.judgeScore} for player ${r.playerId} — must be 1–10`);
    }
  }
  if (deduped.length < submissions.length) {
    throw new Error(`Judge omitted ${submissions.length - deduped.length} player(s) from rankings`);
  }

  // Sort by judgeScore desc; tiebreak by playerId so a score tie yields a deterministic
  // winner rather than an arbitrary, order-dependent one.
  const sorted = [...deduped].sort((a, b) => b.judgeScore - a.judgeScore || a.playerId.localeCompare(b.playerId));

  const rankings: PlayerRanking[] = sorted.map((r, i) => {
    const sub = submissions.find((s) => s.playerId === r.playerId)!;
    const gamePoints = i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0;
    return {
      playerId: sub.playerId,
      playerName: sub.playerName,
      avatarId: sub.avatarId,
      schemeCard: sub.schemeCard,
      explanation: sub.explanation,
      judgeScore: r.judgeScore,
      judgeComment: r.judgeComment,
      gamePoints,
      bonusPoint: r.bonusPoint,
    };
  });

  const winner = rankings[0];
  return {
    winnerId: winner.playerId,
    winnerName: winner.playerName,
    schemeCard: winner.schemeCard,
    explanation: winner.explanation,
    reasoning,
    bonusPoint: winner.bonusPoint,
    rankings,
  };
}

function fallbackJudge(submissions: Submission[]): JudgeVerdict {
  // Shuffle for random ranking
  const shuffled = [...submissions].sort(() => Math.random() - 0.5);
  const reasoning = FALLBACK_VERDICTS[Math.floor(Math.random() * FALLBACK_VERDICTS.length)];

  const rankings: PlayerRanking[] = shuffled.map((sub, i) => {
    // Distribute scores evenly across [1, 10] regardless of player count
    const judgeScore = shuffled.length === 1 ? 10 : Math.round(10 - (9 * i) / (shuffled.length - 1));
    const gamePoints = i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0;
    // Match Claude's bonus point rule: single sentence or less
    const bonusPoint = sub.explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1;
    return {
      playerId: sub.playerId,
      playerName: sub.playerName,
      avatarId: sub.avatarId,
      schemeCard: sub.schemeCard,
      explanation: sub.explanation,
      judgeScore,
      judgeComment: FALLBACK_COMMENTS[i % FALLBACK_COMMENTS.length],
      gamePoints,
      bonusPoint,
    };
  });

  const winner = rankings[0];
  return {
    winnerId: winner.playerId,
    winnerName: winner.playerName,
    schemeCard: winner.schemeCard,
    explanation: winner.explanation,
    reasoning,
    bonusPoint: winner.bonusPoint,
    rankings,
  };
}

/**
 * An explicit "no winner this round" verdict — used when the judge can't decide
 * (Claude timed out/errored) or there were no submissions. Rankings are empty and no
 * points are awarded; the UI shows a dedicated no-winner screen rather than inventing a
 * ranking. (Distinct from the no-API-key path, which deliberately uses fallbackJudge.)
 */
export function noWinnerVerdict(reason = "The judge couldn't pick a winner this round."): JudgeVerdict {
  return {
    winnerId: '',
    winnerName: '',
    schemeCard: { id: '', name: '', hi: '', desc: '', bullets: [] },
    explanation: '',
    reasoning: reason,
    bonusPoint: false,
    rankings: [],
    noWinner: true,
  };
}

export async function judgeRound(
  challenge: ChallengeCard,
  submissions: Submission[],
): Promise<JudgeVerdict> {
  // Genuinely nobody played — there is no winner to crown.
  if (!submissions.length) return noWinnerVerdict('No one submitted an answer this round.');

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeJudge(challenge, submissions);
    } catch (err) {
      // The live API call failed or exceeded the 8s timeout — fall back to local judging
      // so the round still resolves with a winner rather than stalling the game.
      console.error('[ai-judge] Claude call failed/timed out; using local fallback judge:', err instanceof Error ? err.message : err);
      return fallbackJudge(submissions);
    }
  }
  // No API key configured — use the local judge.
  return fallbackJudge(submissions);
}
