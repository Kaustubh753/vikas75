// Unit tests for the shared standings ranking. Runs with plain node — no framework:
// `npm run test:standings`. Node ≥ 22.18 strips the types from standings.ts natively.
//
// These exist because the six surfaces that show a table of players used to rank with six
// hand-written comparators, and two of them had drifted onto the wrong key (points instead of
// round wins). The oracle at the bottom is the real guard: it asserts the between-rounds board
// and the final podium can never name different leaders, which is the bug that started this.
import assert from 'node:assert/strict';
import { rankPlayers } from '../src/lib/standings.ts';

let passed = 0;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const p = (id, roundsWon, score) => ({ id, roundsWon, score });

test('orders by round wins before points', () => {
  const { players } = rankPlayers([p('a', 0, 9), p('b', 2, 1)]);
  assert.deepEqual(players.map((x) => x.id), ['b', 'a']);
});
test('points break a tie on round wins', () => {
  const { players } = rankPlayers([p('a', 1, 3), p('b', 1, 7)]);
  assert.deepEqual(players.map((x) => x.id), ['b', 'a']);
});
test('id breaks a tie on both, so order never depends on insertion order', () => {
  const forward = rankPlayers([p('a', 1, 3), p('b', 1, 3)]).players.map((x) => x.id);
  const reverse = rankPlayers([p('b', 1, 3), p('a', 1, 3)]).players.map((x) => x.id);
  assert.deepEqual(forward, ['a', 'b']);
  assert.deepEqual(forward, reverse);
});
test('missing roundsWon (legacy rooms) counts as zero rather than NaN', () => {
  const { players } = rankPlayers([{ id: 'a', score: 5 }, p('b', 1, 0)]);
  assert.deepEqual(players.map((x) => x.id), ['b', 'a']);
});

test('level players share a competition rank (1,1,3)', () => {
  const { ranks } = rankPlayers([p('a', 1, 3), p('b', 1, 3), p('c', 0, 0)]);
  assert.deepEqual(ranks, [1, 1, 3]);
});
test('a run of three ties still resumes at the right place', () => {
  const { ranks } = rankPlayers([p('a', 2, 0), p('b', 1, 1), p('c', 1, 1), p('d', 1, 1), p('e', 0, 0)]);
  assert.deepEqual(ranks, [1, 2, 2, 2, 5]);
});
test('placeOf returns the shared rank, not the array index', () => {
  const s = rankPlayers([p('a', 1, 3), p('b', 1, 3), p('c', 0, 0)]);
  assert.equal(s.placeOf('b'), 1);
  assert.equal(s.placeOf('c'), 3);
});
test('placeOf is 0 for someone not in the room', () => {
  assert.equal(rankPlayers([p('a', 1, 3)]).placeOf('ghost'), 0);
});

test('a dead heat is joint champions, not an id-tiebreak crown', () => {
  const s = rankPlayers([p('a', 2, 6), p('b', 2, 6), p('c', 0, 0)]);
  assert.equal(s.tied, true);
  assert.deepEqual(s.leaders.map((x) => x.id), ['a', 'b']);
});
test('a clear winner is not a tie', () => {
  const s = rankPlayers([p('a', 2, 6), p('b', 1, 6)]);
  assert.equal(s.tied, false);
  assert.deepEqual(s.leaders.map((x) => x.id), ['a']);
});
test('an all-zero washout has no leader and is not a tie', () => {
  // Every round a no-winner: nobody has scored, so nothing may be crowned or highlighted.
  const s = rankPlayers([p('a', 0, 0), p('b', 0, 0)]);
  assert.equal(s.hasLead, false);
  assert.equal(s.tied, false);
  assert.deepEqual(s.leaders, []);
  assert.equal(s.isLeader(p('a', 0, 0)), false);
});
test('an empty room is safe', () => {
  const s = rankPlayers([]);
  assert.deepEqual(s.players, []);
  assert.deepEqual(s.ranks, []);
  assert.equal(s.hasLead, false);
  assert.equal(s.tied, false);
  assert.equal(s.placeOf('anyone'), 0);
});
test('isLeader marks every player level with the top, and no one else', () => {
  const s = rankPlayers([p('a', 2, 6), p('b', 2, 6), p('c', 2, 5)]);
  assert.equal(s.isLeader(p('x', 2, 6)), true);
  assert.equal(s.isLeader(p('c', 2, 5)), false);
});

test('the input array is not mutated', () => {
  const input = [p('a', 0, 1), p('b', 3, 0)];
  const copy = input.slice();
  rankPlayers(input);
  assert.deepEqual(input, copy);
});
test('accepts any iterable, not just arrays', () => {
  const s = rankPlayers(new Set([p('a', 1, 0), p('b', 2, 0)]));
  assert.deepEqual(s.players.map((x) => x.id), ['b', 'a']);
});

// ── the oracle ──
// The bug this module was written for: the between-rounds board ranked on points while the
// podium ranked on round wins, so the room could watch one player lead all game and another
// take the trophy. Both now call rankPlayers, so the only way to regress is to stop calling it
// — but assert the property anyway, over randomised tables, so a future "small tweak" to the
// comparator can't quietly reintroduce a disagreement.
test('the leader shown between rounds is always the player who wins the game', () => {
  let seed = 20260907;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let trial = 0; trial < 2000; trial++) {
    const players = Array.from({ length: 2 + rnd(8) }, (_, i) => p(`p${i}`, rnd(4), rnd(12)));
    const board = rankPlayers(players);   // what the between-rounds screens render
    const podium = rankPlayers(players);  // what the game-over screens render
    assert.deepEqual(podium.players.map((x) => x.id), board.players.map((x) => x.id));
    assert.deepEqual(podium.ranks, board.ranks);
    // Whoever the board highlights is exactly who the podium crowns.
    assert.deepEqual(
      board.players.filter((x) => board.isLeader(x)).map((x) => x.id),
      podium.leaders.map((x) => x.id),
    );
    // And a highlighted leader always has the maximum round-win count in the room.
    if (board.hasLead) {
      const best = Math.max(...players.map((x) => x.roundsWon));
      for (const l of board.leaders) assert.equal(l.roundsWon, best);
    }
  }
});

for (const { name, fn } of tests) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err && err.stack ? err.stack.split('\n').slice(0, 3).join('\n    ') : err}`);
  }
}
console.log(`\n${passed}/${tests.length} passed`);
if (passed !== tests.length) process.exit(1);
