// Validates context/cards_fit.json against the deck: every challenge present, only real scheme
// ids, no scheme listed twice for a challenge, and every scheme in tier 1 or 2 somewhere.
// Run: node scripts/check-cards-fit.mjs
import { readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(new URL(`../context/${p}`, import.meta.url), 'utf8'));
const schemes = read('cards_schemes.json'), challenges = read('cards_challenges.json'), fit = read('cards_fit.json');
const ids = new Set(schemes.map((s) => s.id));
const problems = [];
for (const c of challenges) {
  const entry = fit.challenges[c.id];
  if (!entry) { problems.push(`${c.id}: missing`); continue; }
  const flat = entry.tiers.flat();
  if (new Set(flat).size !== flat.length) problems.push(`${c.id}: a scheme is listed twice`);
  for (const s of flat) if (!ids.has(s)) problems.push(`${c.id}: unknown scheme ${s}`);
  if (entry.tiers.length !== 4) problems.push(`${c.id}: expected 4 tiers, got ${entry.tiers.length}`);
  if (!entry.tiers[0]?.length) problems.push(`${c.id}: tier 1 is empty`);
}
for (const id of Object.keys(fit.challenges)) if (!challenges.some((c) => c.id === id)) problems.push(`${id}: not a challenge card`);
const strong = new Set(Object.values(fit.challenges).flatMap((e) => [...e.tiers[0], ...e.tiers[1]]));
for (const s of schemes) if (!strong.has(s.id)) problems.push(`${s.id} (${s.name}) is never a tier-1 or tier-2 fit`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`cards_fit.json ok: ${challenges.length} challenges × ${schemes.length} schemes, every scheme a strong fit somewhere`);
