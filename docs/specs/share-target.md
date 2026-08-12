# Spec: Android Web Share Target

## The goal

Someone is browsing Zillow/Redfin/Realtor.com in their phone's app or browser, taps
Share, and AreaIQ appears as a destination. This is the "layered on top of the
listing sites" entry point discussed for the app — buildable today with zero app
store review, on Android only.

## How it works

- `manifest.webmanifest` declares a `share_target` (`action: /share`, `method: GET`,
  mapping `title`/`text`/`url`). Chrome on Android registers the *installed* PWA as a
  share-sheet destination once this is present — the user must have added AreaIQ to
  their home screen first (the existing install prompt covers this).
- `/share` receives the shared `title`/`text`/`url` as query params and calls
  `matchAreaFromShare()` (`src/lib/share-target.ts`) against every known area id (4
  pilots + 334 regions).
- The matcher is intentionally simple and honest: it checks whether a known city
  slug (e.g. `eastvale`, `los-angeles`) appears as a hyphen-bounded token in the
  shared text/URL, preferring the longest/most specific match. It does **not**
  geocode the exact street address — that needs a geocoding API and per-place
  boundaries we don't have yet (v2 candidate: free Census Geocoder + point-in-place
  lookup, extending the county point-in-polygon logic already in `regions-build.ts`).
- Match found → redirect straight to `/area/[id]`. No match → land on a fallback page
  with the search bar pre-loaded and the raw shared content shown, so the share
  wasn't a dead end even when we can't auto-resolve it.

## Platform limits (be upfront about these)

- **iOS has no equivalent.** Safari does not implement the Web Share Target API —
  Apple only allows share-sheet destinations from apps installed via the App Store.
  Reaching iOS needs the Capacitor native wrapper (separate track).
- **City-level, not address-level.** A share from a Highland Park listing that uses
  "Los Angeles" as the city in its URL lands on the Los Angeles-area result (or the
  nearest coverage snapshot), not a Highland-Park-specific one, unless the shared
  text happens to contain "Highland Park" too. This is a real limitation, not a bug —
  documented so it isn't reported as broken.

## Hard lines (unchanged)

No tracking of what was shared beyond rendering the result; no storage of shared
listing content server-side (it's handled entirely as a query param round-trip).
