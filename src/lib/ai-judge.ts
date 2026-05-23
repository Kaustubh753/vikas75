import type { ChallengeCard, Submission, JudgeVerdict, PlayerRanking } from '@/types/game';

const SYSTEM_PROMPT = `You are the AI Judge for Vikas 75, a game show about Indian government schemes.
Your job is to rank ALL answers from best to worst and give each a score from 1 to 10.

Scoring priority:
1. Innovative + funny connection (jugaad thinking rewarded)
2. Unexpected but valid
3. Technically correct but interesting
4. Boring but accurate (gets a 4–5)

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
  const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s — Claude Sonnet p95 latency is ~5s; 8s was too aggressive
  let response: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    response = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: controller.signal }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
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
  for (const r of rankingsRaw) {
    if (!submissionIds.has(r.playerId)) throw new Error(`Unknown player ${r.playerId} in rankings`);
    if (typeof r.judgeScore !== 'number' || isNaN(r.judgeScore) || r.judgeScore < 1 || r.judgeScore > 10) {
      throw new Error(`Invalid judgeScore ${r.judgeScore} for player ${r.playerId} — must be 1–10`);
    }
  }
  if (rankingsRaw.length < submissions.length) {
    throw new Error(`Judge omitted ${submissions.length - rankingsRaw.length} player(s) from rankings`);
  }

  // Sort by judgeScore desc
  const sorted = [...rankingsRaw].sort((a, b) => b.judgeScore - a.judgeScore);

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

export async function judgeRound(
  challenge: ChallengeCard,
  submissions: Submission[],
): Promise<JudgeVerdict> {
  if (!submissions.length) throw new Error('No submissions to judge');
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeJudge(challenge, submissions);
    } catch (err) {
      console.error('[ai-judge] Claude failed, falling back to random judge:', err instanceof Error ? err.message : err);
    }
  }
  return fallbackJudge(submissions);
}
