// Regenerate public/scheme-details/*.webp from the office's scheme-details PDF.
//
// The source PDF (~15 MB of full-page infographics) is deliberately NOT in the repo — only the
// derived, web-sized images are. To regenerate: export the PDF's pages as images into a folder
// (any tool; they must be named page02.jpg … page76.jpg, matching the PDF's own page numbers),
// then run:
//
//   node scripts/build-scheme-details.mjs <pages-dir>
//
// The page → scheme-id mapping lives in context/scheme_details_map.json; page 1 is the cover
// and page 17 (Digital India Internship Scheme) has no matching deck card, so both are unmapped.
// Keep src/lib/scheme-details.ts's id list in sync with that map — the check at the end of this
// script reports any drift.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node scripts/build-scheme-details.mjs <dir-of-page-images>');
  process.exit(1);
}

const OUT = 'public/scheme-details';
// No downscale: the source PDF is already a compressed export whose pages are 921×1650, so
// that is the fidelity ceiling — shrinking further only threw away text sharpness. q88 keeps
// the re-encode close to the source (~225 KB each). The sheet serves these straight from the
// CDN (`unoptimized`), so this file IS what the phone downloads; don't shrink it to save repo
// weight without checking the small body text still reads when zoomed.
const QUALITY = 88;

const { map } = JSON.parse(fs.readFileSync('context/scheme_details_map.json', 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

let bytes = 0;
for (const [page, id] of Object.entries(map)) {
  const src = path.join(dir, `page${String(page).padStart(2, '0')}.jpg`);
  if (!fs.existsSync(src)) {
    console.error(`missing source page for ${id}: ${src}`);
    process.exit(1);
  }
  const buf = await sharp(src).webp({ quality: QUALITY, effort: 6 }).toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}.webp`), buf);
  bytes += buf.length;
}
const n = Object.keys(map).length;
console.log(`wrote ${n} images, ${(bytes / 1048576).toFixed(1)} MB (avg ${(bytes / n / 1024).toFixed(0)} KB)`);

const listed = new Set([...fs.readFileSync('src/lib/scheme-details.ts', 'utf8').matchAll(/'(s\d{3})'/g)].map((m) => m[1]));
const mapped = new Set(Object.values(map));
const drift = [...mapped].filter((id) => !listed.has(id)).concat([...listed].filter((id) => !mapped.has(id)));
if (drift.length) {
  console.error(`src/lib/scheme-details.ts is out of sync with the map: ${drift.join(', ')}`);
  process.exit(1);
}
console.log('src/lib/scheme-details.ts matches the map ✓');
