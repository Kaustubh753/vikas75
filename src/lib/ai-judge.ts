import type { ChallengeCard, Submission, JudgeVerdict } from '@/types/game';

const SYSTEM_PROMPT = `You are the AI Judge for Vikas 75, a game show about Indian government schemes.
Your job is to pick the most creative, funny, or innovative answer — NOT the most technically correct one.

Scoring priority:
1. Innovative + funny connection (jugaad thinking rewarded)
2. Unexpected but valid
3. Technically correct but interesting
4. Boring but accurate (last resort)

Personality: You are a sharp, witty commentator who appreciates clever thinking. You have the energy of a game show host — enthusiastic, occasionally sarcastic, always entertaining. Write like you're talking to a crowd.

Rules:
- Accept Hinglish (Hindi + English mix) answers fully and reward creativity in any language
- Keep your verdict reasoning to 2–3 sentences MAX
- Occasionally add extra flavour text for a particularly clever answer
- If an explanation is one sentence or less, note it (bonus point eligible)

You must respond with valid JSON only, no markdown fences.`;

const FALLBACK_VERDICTS = [
  "The judges have deliberated and this scheme wins for sheer jugaad! Sometimes the most unexpected connection is the most brilliant one. The crowd agrees!",
  "Out of all the answers, this one made us do a double-take — in the best possible way. Pure desi ingenuity on display here!",
  "Listen, we've seen thousands of schemes, but connecting it THIS way? Ek number! The audience is on their feet.",
  "This answer had the whole panel laughing AND nodding. That's the rarest combo in Vikas 75 history!",
  "Bold. Creative. Slightly unhinged. Exactly what we reward here. Badhaai ho to our winner!",
  "When life gives you a scheme, this player made chai, samosa, AND biryani out of it. Masterclass.",
  "The AI judge was genuinely surprised. That doesn't happen often. Well played!",
  "Other answers were good. This one was great. The difference? Pure Bharat ki creativity!",
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

  const userMessage = `Challenge Card:
"${challenge.en}"
(Hindi: ${challenge.hi})

Submissions:
${submissionsText}

Pick the best answer. Respond with JSON in this exact format (no markdown, no extra text):
{
  "playerId": "<exact playerId from above>",
  "playerName": "<exact playerName from above>",
  "reasoning": "<2-3 sentence witty verdict>",
  "bonusPoint": <true if their explanation was one sentence or less, else false>
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  // Strip accidental markdown fences
  const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(json);

  const winner = submissions.find(
    (s) => s.playerId === parsed.playerId || s.playerName === parsed.playerName
  );
  if (!winner) throw new Error('Claude returned unknown winner');

  return {
    winnerId: winner.playerId,
    winnerName: winner.playerName,
    schemeCard: winner.schemeCard,
    explanation: winner.explanation,
    reasoning: parsed.reasoning,
    bonusPoint: parsed.bonusPoint ?? false,
  };
}

function fallbackJudge(submissions: Submission[]): JudgeVerdict {
  const winner = submissions[Math.floor(Math.random() * submissions.length)];
  const reasoning = FALLBACK_VERDICTS[Math.floor(Math.random() * FALLBACK_VERDICTS.length)];
  // Bonus point if explanation is one sentence (rough heuristic: no period mid-string)
  const bonusPoint = winner.explanation.trim().split(/[.!?]/).filter(Boolean).length <= 1;
  return {
    winnerId: winner.playerId,
    winnerName: winner.playerName,
    schemeCard: winner.schemeCard,
    explanation: winner.explanation,
    reasoning,
    bonusPoint,
  };
}

export async function judgeRound(
  challenge: ChallengeCard,
  submissions: Submission[]
): Promise<JudgeVerdict> {
  if (!submissions.length) throw new Error('No submissions to judge');
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeJudge(challenge, submissions);
    } catch (err) {
      console.error('Claude judge failed, falling back:', err);
    }
  }
  return fallbackJudge(submissions);
}
