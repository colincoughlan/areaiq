/**
 * Demo Pulse venues — fictional, aligned with the demo offers so the
 * offer↔busyness story connects (Monterey Taproom is Quiet AND has 30% off).
 * Signal patterns vary with the local hour so the demo feels alive.
 */

import type { BusynessSignal, Vibe } from "./busyness";

export interface DemoVenue {
  id: string;
  name: string;
  category: string;
  address: string;
  areaIds: string[]; // pilot areas where this venue appears
  offerId?: string; // links to a demo offer
  signals: BusynessSignal[];
}

function signalsFor(pattern: Vibe, now: Date): BusynessSignal[] {
  const t = now.getTime();
  const iso = (minAgo: number) => new Date(t - minAgo * 60_000).toISOString();
  switch (pattern) {
    case "quiet":
      return [{ kind: "merchant", at: iso(18), vibe: "quiet" }];
    case "steady":
      return [
        { kind: "merchant", at: iso(40), vibe: "steady" },
        { kind: "guest", at: iso(25) },
        { kind: "guest", at: iso(70) },
      ];
    case "lively":
      return [
        { kind: "merchant", at: iso(30), vibe: "lively" },
        { kind: "guest", at: iso(10) },
        { kind: "guest", at: iso(20) },
        { kind: "guest", at: iso(35) },
      ];
    case "packed":
      return [
        { kind: "merchant", at: iso(15), vibe: "packed" },
        { kind: "guest", at: iso(5) },
        { kind: "guest", at: iso(8) },
        { kind: "guest", at: iso(12) },
        { kind: "guest", at: iso(22) },
      ];
  }
}

/** Evening = livelier bars; morning = livelier coffee. Deterministic per hour. */
export function demoVenues(now = new Date()): DemoVenue[] {
  const hour = now.getHours();
  const evening = hour >= 17 || hour < 2;
  const morning = hour >= 6 && hour < 11;

  return [
    {
      id: "venue-taproom",
      name: "Monterey Taproom (demo)",
      category: "drink",
      address: "Monterey Rd, Highland Park",
      areaIds: ["highland-park"],
      offerId: "demo-hlp-2",
      signals: signalsFor(evening ? "quiet" : "quiet", now), // quiet → that's WHY the 30% offer exists
    },
    {
      id: "venue-coffee",
      name: "Avenue 57 Coffee Co. (demo)",
      category: "coffee",
      address: "York Blvd, Highland Park",
      areaIds: ["highland-park"],
      offerId: "demo-hlp-1",
      signals: signalsFor(morning ? "packed" : "steady", now),
    },
    {
      id: "venue-cantina",
      name: "Figueroa Cantina (demo)",
      category: "food",
      address: "N Figueroa St, Highland Park",
      areaIds: ["highland-park"],
      signals: signalsFor(evening ? "lively" : "steady", now),
    },
    {
      id: "venue-listening",
      name: "York Listening Room (demo)",
      category: "drink",
      address: "York Blvd, Highland Park",
      areaIds: ["highland-park"],
      signals: signalsFor(evening ? "packed" : "quiet", now),
    },
    {
      id: "venue-station-grill",
      name: "The Station Grill (demo)",
      category: "food",
      address: "The Station, Eastvale",
      areaIds: ["eastvale"],
      offerId: "demo-eas-1",
      signals: signalsFor(evening ? "steady" : "quiet", now),
    },
    {
      id: "venue-village-cafe",
      name: "Village Corner Café (demo)",
      category: "coffee",
      address: "Claremont Village",
      areaIds: ["claremont"],
      offerId: "demo-cla-1",
      signals: signalsFor(morning ? "lively" : "steady", now),
    },
    {
      id: "venue-southridge-grill",
      name: "Southridge Grill House (demo)",
      category: "food",
      address: "Sierra Ave, Fontana",
      areaIds: ["fontana-southridge"],
      signals: signalsFor(evening ? "lively" : "quiet", now),
    },
  ];
}
