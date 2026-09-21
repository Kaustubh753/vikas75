// Which scheme cards have a full infographic guide, and the path to one in a given language.
// The images are the office's own per-scheme one-pagers (what the scheme is, its key features,
// how to apply, the official portal link) — see `context/scheme_details_map.json` and
// `context/scheme_details_map_hi.json` for the PDF-page → scheme-id mappings and
// `scripts/build-scheme-details.mjs` to regenerate either deck.
//
// The list is explicit rather than "assume every id has one": one deck card (Digital India,
// `s018`) has no guide in EITHER language. Both source PDFs make the same editorial choice —
// their Digital India page is the Digital India *Internship* Scheme, far narrower than the broad
// card — so the coverage is the same 74 of 75 both ways, and ONE list serves both decks. Do not
// split it into a list per language unless the decks actually diverge: two hand-maintained
// copies of the same 74 ids is exactly the arrangement that let six ranking comparators drift
// apart in bug #25. `scripts/build-scheme-details.mjs` checks each map against this list.
//
// Callers must treat `null` as "no guide" and hide the entry point entirely; a missing image
// otherwise renders as a broken box inside the sheet.

export type GuideLang = 'en' | 'hi';

const IDS_WITH_GUIDE = new Set([
  's001','s002','s003','s004','s005','s006','s007','s008','s009','s010',
  's011','s012','s013','s014','s015','s016','s017','s019','s020',
  's021','s022','s023','s024','s025','s026','s027','s028','s029','s030',
  's031','s032','s033','s034','s035','s036','s037','s038','s039','s040',
  's041','s042','s043','s044','s045','s046','s047','s048','s049','s050',
  's051','s052','s053','s054','s055','s056','s057','s058','s059','s060',
  's061','s062','s063','s064','s065','s066','s067','s068','s069','s070',
  's071','s072','s073','s074','s075',
]);

const GUIDE_DIR: Record<GuideLang, string> = {
  en: '/scheme-details',
  hi: '/scheme-details-hi',
};

export function hasSchemeDetail(schemeId: string): boolean {
  return IDS_WITH_GUIDE.has(schemeId);
}

/** Public path to a scheme's infographic guide in `lang`, or null when there is none. */
export function schemeDetailImage(schemeId: string, lang: GuideLang = 'en'): string | null {
  return IDS_WITH_GUIDE.has(schemeId) ? `${GUIDE_DIR[lang]}/${schemeId}.webp` : null;
}
