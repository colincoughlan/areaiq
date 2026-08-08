# Spec: App packaging — PWA now, native path later

## Strategy

The brief excludes native iOS/Android from the MVP but requires PWA support. This spec
implements the PWA and structures the codebase so a native app is a packaging exercise,
not a rebuild.

## What's implemented

**PWA layer**
- `public/manifest.webmanifest` — installable app: name, standalone display, brand
  theme (#0a4a40), portrait orientation.
- `public/icons/` — generated brand icons: 192/512, 512-maskable (Android adaptive),
  180 apple-touch. Source SVG is the compass mark; regenerate at any size.
- `public/sw.js` — deliberately conservative service worker: static assets cache-first,
  pages network-first with offline fallback, **API routes network-only** (data freshness
  and confidence labels must never be silently stale).
- `PwaRegister` client component — registers the SW in production builds only.
- Viewport/meta: theme-color, apple-web-app tags, `viewport-fit=cover` for notched
  phones.

Result: on iOS Safari "Add to Home Screen" and Android Chrome "Install app" produce a
standalone, branded app window.

**API-first layer**
- `GET /api/areas` — area list (id, name, county, coords, direction).
- `GET /api/areas/[id]` — the complete merged payload (base + ACS + permits + schools
  overlays, source metadata, disclaimer). Statically generated; serialization logic is
  pure (`src/lib/api-payload.ts`) and unit-tested.
- `POST /api/ask` — existing AI endpoint; already client-agnostic JSON.

Any future client — Capacitor shell, React Native, partner integration — consumes these
three endpoints and renders. No web-page scraping of our own app, no duplicated logic.

## Native path (when justified)

1. **Capacitor wrapper** (cheapest): wraps the deployed web app in a store-distributable
   shell; add push notifications (area alerts) via Capacitor plugins. The PWA work above
   is exactly what Capacitor needs.
2. **React Native** (only if the product demands deep native UX): the API layer is the
   contract; scoring/validation logic in `src/lib` is portable TypeScript.

Store rules note: Apple rejects thin wrappers without native value — ship the Capacitor
app only alongside a native feature (push alerts for saved areas is the natural one,
which pairs with Supabase auth in the backlog).

## Acceptance tests

- Payload serializer: all areas listed; overlays applied (real ACS/permit/school values
  present); source metadata on every metric; unknown area → null.
- Live smoke: manifest, sw.js, icons, and both API endpoints return 200 with expected
  content from a production server.
