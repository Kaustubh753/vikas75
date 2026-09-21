// Regenerate the Explore scheme guides from the office's scheme-details PDFs.
//
// There are TWO source decks and they are NOT the same document translated page for page:
//
//   en  Vikas75_SchemeDetails_2.pdf   pages 2-76,  in the deck's own order (page 4 is s010),
//                                     and page 17 is the Digital India *Internship* Scheme —
//                                     far narrower than the broad Digital India card — so s018
//                                     has NO English guide. 74 of 75 cards covered.
//   hi  Schemes_Hindi_4.pdf           pages 10-84, in exact card order (page 10 = s001), but it
//                                     makes the SAME choice at Digital India: its page 27 is the
//                                     Internship Scheme too, so s018 is unmapped here as well.
//                                     The same 74 of 75 cards, in a different page order.
//
// Neither PDF is in the repo (~15 MB and ~11 MB) — only the derived, web-sized images are. To
// regenerate: export the pages as images into a folder (any tool; named page02.jpg … matching
// the PDF's own page numbers), then run:
//
//   node scripts/build-scheme-details.mjs <pages-dir>            # English, the default
//   node scripts/build-scheme-details.mjs <pages-dir> --lang hi  # Hindi
//
// The page → scheme-id mappings live in context/scheme_details_map.json and
// context/scheme_details_map_hi.json. Keep src/lib/scheme-details.ts's id list in sync with them
// — the check at the end of this script reports any drift in the deck it just built.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const langIdx = args.indexOf('--lang');
const lang = langIdx === -1 ? 'en' : args[langIdx + 1];
const dir = args.filter((a, i) => i !== langIdx && i !== langIdx + 1)[0];
if (!dir || (lang !== 'en' && lang !== 'hi')) {
  console.error('usage: node scripts/build-scheme-details.mjs <dir-of-page-images> [--lang en|hi]');
  process.exit(1);
}

const DECK = {
  en: { out: 'public/scheme-details', map: 'context/scheme_details_map.json' },
  hi: { out: 'public/scheme-details-hi', map: 'context/scheme_details_map_hi.json' },
}[lang];
// One list covers both decks — they omit the same card (see scheme-details.ts).
const LIST = 'IDS_WITH_GUIDE';
const OUT = DECK.out;
// Both decks land on exactly 921×1650, because the reader zooms to the asset's own 921px width
// and a second geometry would need a second set of layout numbers for nothing. That is also the
// fidelity ceiling in both cases: the English PDF is a compressed export at 921×1650, and the
// Hindi one carries page images of ~880-911px, so neither has detail above this to keep. q88
// holds the re-encode close to the source (~225 KB each). The sheet serves these straight from
// the CDN (`unoptimized`), so this file IS what the phone downloads; don't shrink it to save
// repo weight without checking the small body text still reads when zoomed.
const QUALITY = 88;
const WIDTH = 921;
const HEIGHT = 1650;

const { map } = JSON.parse(fs.readFileSync(DECK.map, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;
for (const [page, id] of Object.entries(map)) {
  const src = path.join(dir, `page${String(page).padStart(2, '0')}.jpg`);
  if (!fs.existsSync(src)) {
    console.error(`missing source page for ${id}: ${src}`);
    process.exit(1);
  }
  // `fit: 'fill'` rather than a cover/contain crop: every page in both decks is already this
  // aspect ratio, so this is a resample to a common size, not a reframe — and a silent crop
  // here would lose a line of the guide rather than announce itself.
  const buf = await sharp(src)
    .resize(WIDTH, HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
  bytes += buf.length;
}
const n = Object.keys(map).length;
console.log(`wrote ${n} ${lang} images to ${OUT}, ${(bytes / 1048576).toFixed(1)} MB (avg ${(bytes / n / 1024).toFixed(0)} KB)`);

// Drift check: the ids this map produces must be exactly the ids the app will offer a guide for.
// Read the list by name rather than scanning the whole file — the surrounding comment names ids
// (s018) that are deliberately absent from it.
const source = fs.readFileSync('src/lib/scheme-details.ts', 'utf8');
const block = source.match(new RegExp(`${LIST}[^=]*=([\\s\\S]*?)\\]\\)`));
if (!block) {
  console.error(`could not find the ${LIST} list in src/lib/scheme-details.ts`);
  process.exit(1);
}
const listed = new Set([...block[1].matchAll(/'(s\d{3})'/g)].map((m) => m[1]));
const mapped = new Set(Object.values(map));
const drift = [...mapped].filter((id) => !listed.has(id)).concat([...listed].filter((id) => !mapped.has(id)));
if (drift.length) {
  console.error(`src/lib/scheme-details.ts ${LIST} is out of sync with ${DECK.map}: ${drift.join(', ')}`);
  process.exit(1);
}
console.log(`src/lib/scheme-details.ts ${LIST} matches ${DECK.map} ✓`);
