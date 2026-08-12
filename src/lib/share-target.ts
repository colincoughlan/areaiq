/**
 * Pure logic for the Android Web Share Target (docs/specs/share-target.md).
 * Zillow/Redfin/Realtor.com listing URLs and share text embed the city name
 * as a token (usually hyphenated in the URL slug). Rather than attempt full
 * street-address geocoding — which needs a geocoding API and point-in-place
 * boundaries we don't have yet — this does a best-effort match against the
 * city names AreaIQ already knows (334 regions + 4 pilots), preferring the
 * longest/most specific match. Honest fallback: no match, no report.
 */

export interface ShareInput {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

/** Normalize to lowercase, hyphen-joined tokens so "Highland Park" and
 * "highland-park" and "Highland-Park-CA" all compare the same way. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Returns the best-matching known area/region id, or null if nothing in the
 * shared content matches a known SoCal city/community slug.
 */
export function matchAreaFromShare(input: ShareInput, candidateIds: string[]): string | null {
  const haystack = normalize([input.title, input.text, input.url].filter(Boolean).join(" "));
  if (!haystack) return null;

  let best: string | null = null;
  for (const id of candidateIds) {
    const needle = `-${id}-`;
    // Pad haystack so a match at the very start/end still hits the boundary check.
    if (`-${haystack}-`.includes(needle)) {
      if (!best || id.length > best.length) best = id;
    }
  }
  return best;
}
