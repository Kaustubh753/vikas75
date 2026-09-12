// Unit tests for src/lib/word-filter.ts — the last thing standing between a player's phone and
// a projector at a public, government-adjacent event.
//
// The false-positive list is the important half. This deck is about Indian government schemes,
// so "Gandhi", "assets", "Classes" and Hindi words that merely start like a swear word MUST
// survive untouched; censoring one of those on the big screen is worse than missing a swear.
import assert from 'node:assert/strict';
import { filterText, sanitizeName } from '../src/lib/word-filter.ts';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const censored = (s) => filterText(s) !== s;

test('censors the base words it always claimed to', () => {
  for (const w of ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'piss', 'slut', 'whore',
                   'chutiya', 'madarchod', 'bhenchod', 'gandu', 'harami', 'randi',
                   'ass', 'gand', 'chut', 'lund']) {
    assert.ok(censored(w), `missed "${w}"`);
  }
});

test('censors inflections — the gap that let the plural of every word through', () => {
  // Every one of these was verified to pass UNCENSORED before this fix.
  for (const w of ['fucking', 'fucks', 'fucked', 'fucker', 'fuckers', 'assholes', 'shitty',
                   'shits', 'bitches', 'bitching', 'bastards', 'pissing', 'sluts', 'whores',
                   'chutiye', 'chutiyo', 'madarchodon', 'behenchod', 'benchod', 'bhosdike',
                   'gandus', 'haramis', 'dumbass']) {
    assert.ok(censored(w), `missed inflection "${w}"`);
  }
});

test('censors case, fullwidth and invisible-split evasions', () => {
  for (const w of ['FUCK', 'FuCkInG', 'ｆｕｃｋ', 'f​uck', 'f⁠uck',
                   'sh­it', 'fu͏ck']) {
    assert.ok(censored(w), `missed evasion ${JSON.stringify(w)}`);
  }
});

test('censors Cyrillic homoglyph substitution', () => {
  assert.ok(censored('fuсk'), 'missed Cyrillic es');      // fuсk
  assert.ok(censored('аsshоle'), 'missed Cyrillic a/o'); // аsshоle
});

test('NO false positives on ordinary and scheme-relevant words', () => {
  const safe = [
    // The one that matters most — gand + hi.
    'Gandhi', 'Mahatma Gandhi', 'Gandhinagar', 'Indira Gandhi',
    // Classic Scunthorpe-family cases for the short roots.
    'assets', 'assess', 'assessment', 'class', 'classes', 'grass', 'passed', 'bass',
    'assistant', 'association', 'assam', 'Assam',
    'cockpit', 'Dickens', 'analysis', 'Scunthorpe', 'Penistone',
    // Scheme and place vocabulary that brushes the Hindi roots.
    'Chandigarh', 'chutney', 'Lucknow', 'Gujarat', 'Sagar', 'Chhattisgarh',
    'Anganwadi', 'Ayushman', 'Swachh', 'Poshan', 'Ujjwala', 'Saansad', 'Sansad',
    'damage', 'damages', 'crapulence', 'shiitake', 'assign', 'assured', 'Kisan', 'Vikas',
  ];
  for (const w of safe) {
    assert.equal(filterText(w), w, `false positive on "${w}"`);
  }
});

test('censorWord hides the whole word, not just the middle', () => {
  // "s**t" and "f*****g" read perfectly clearly from the back of a hall.
  assert.equal(filterText('shit'), '****');
  assert.equal(filterText('fucking'), '*******');
  assert.ok(!/[a-z]/i.test(filterText('what the fuck')).valueOf() === false); // sanity: other words survive
  assert.equal(filterText('what the fuck'), 'what the ****');
});

test('filterText EXPANDS its input — callers must truncate afterwards', () => {
  // This is the property that made every length cap bypassable when callers sliced first.
  const squared = '㌖'; // ㌖ → キロメートル
  assert.equal(squared.length, 1);
  assert.equal(filterText(squared).length, 6, 'NFKC expands 1 char to 6');
  assert.ok(filterText(squared.repeat(200)).length > 1000);
});

test('sanitizeName normalises, strips and caps in the right order', () => {
  const squared = '㌖';
  assert.equal(sanitizeName(squared.repeat(30)).length, 30, 'cap applies AFTER expansion');
  // The <> strip must survive NFKC — fullwidth brackets fold to ASCII ones.
  assert.equal(sanitizeName('＜img src=x＞'), 'img src=x');
  assert.equal(sanitizeName('<b>hi</b>'), 'bhi/b');
  // Control, format and bidi characters never reach the projector.
  assert.equal(sanitizeName('Bob‮reversed'), 'Bobreversed');
  assert.equal(sanitizeName('two\nlines'), 'two lines');
  // Invisible-only names are rejected outright.
  for (const invisible of ['ㅤ', '⠀', '​', '   ', '‮']) {
    assert.equal(sanitizeName(invisible), '', `invisible name ${JSON.stringify(invisible)} accepted`);
  }
  // Real names, including Devanagari and emoji, survive.
  assert.equal(sanitizeName('  Priya  '), 'Priya');
  assert.equal(sanitizeName('प्रिया'), 'प्रिया');
  assert.equal(sanitizeName('Ravi 🎉'), 'Ravi 🎉');
  assert.equal(sanitizeName(123), '');
  assert.equal(sanitizeName(null), '');
});

test('sanitizeName still censors profanity in a name', () => {
  assert.ok(!/fucking/i.test(sanitizeName('fucking Ravi')));
});

let pass = 0;
for (const t of tests) {
  try { t.fn(); console.log(`  ✓ ${t.name}`); pass++; }
  catch (err) { console.log(`  ✗ ${t.name}\n    ${err.message}`); }
}
console.log(`\n${pass}/${tests.length} passed`);
process.exit(pass === tests.length ? 0 : 1);
