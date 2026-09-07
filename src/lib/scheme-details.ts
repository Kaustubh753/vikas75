// Which scheme cards have a full infographic guide in `public/scheme-details/`, and the path
// to one. The images are the office's own per-scheme one-pagers (what the scheme is, its key
// features, how to apply, the official portal link) — see `context/scheme_details_map.json`
// for the PDF-page → scheme-id mapping and `scripts/build-scheme-details.mjs` to regenerate.
//
// The list is explicit rather than "assume every id has one": one deck card (Digital India)
// has no matching page in the source deck, and a missing image would otherwise render as a
// broken box inside the sheet. Callers should treat `null` as "no guide" and hide the entry
// point entirely.

const IDS_WITH_DETAILS = new Set([
  's001','s002','s003','s004','s005','s006','s007','s008','s009','s010',
  's011','s012','s013','s014','s015','s016','s017','s019','s020',
  's021','s022','s023','s024','s025','s026','s027','s028','s029','s030',
  's031','s032','s033','s034','s035','s036','s037','s038','s039','s040',
  's041','s042','s043','s044','s045','s046','s047','s048','s049','s050',
  's051','s052','s053','s054','s055','s056','s057','s058','s059','s060',
  's061','s062','s063','s064','s065','s066','s067','s068','s069','s070',
  's071','s072','s073','s074','s075',
]);

export function hasSchemeDetail(schemeId: string): boolean {
  return IDS_WITH_DETAILS.has(schemeId);
}

/** Public path to a scheme's infographic guide, or null when the deck has none for it. */
export function schemeDetailImage(schemeId: string): string | null {
  return IDS_WITH_DETAILS.has(schemeId) ? `/scheme-details/${schemeId}.webp` : null;
}
