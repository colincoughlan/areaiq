import { describe, expect, it } from "vitest";
import {
  canCheckIn,
  computePulse,
  decayWeight,
  freshnessLabel,
  type BusynessSignal,
} from "./busyness";
import { demoVenues } from "./demo-pulse";

const NOW = new Date("2026-08-07T19:00:00-07:00");
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();

describe("decayWeight", () => {
  it("halves every 90 minutes", () => {
    expect(decayWeight(ago(0), NOW)).toBeCloseTo(1, 5);
    expect(decayWeight(ago(90), NOW)).toBeCloseTo(0.5, 5);
    expect(decayWeight(ago(180), NOW)).toBeCloseTo(0.25, 5);
  });
  it("future timestamps count zero", () => {
    expect(decayWeight(ago(-10), NOW)).toBe(0);
  });
});

describe("computePulse", () => {
  it("no signals → unknown", () => {
    const p = computePulse([], NOW);
    expect(p.level).toBe("unknown");
    expect(p.freshnessMinutes).toBeNull();
  });

  it("stale signals → unknown even if numerous", () => {
    const signals: BusynessSignal[] = Array.from({ length: 10 }, () => ({
      kind: "guest",
      at: ago(200),
    }));
    expect(computePulse(signals, NOW).level).toBe("unknown");
  });

  it("a fresh merchant report anchors the level", () => {
    const p = computePulse([{ kind: "merchant", at: ago(10), vibe: "packed" }], NOW);
    expect(p.level).toBe("packed");
    const q = computePulse([{ kind: "merchant", at: ago(10), vibe: "quiet" }], NOW);
    expect(q.level).toBe("quiet");
  });

  it("guest check-ins alone scale from quiet to lively", () => {
    const one = computePulse([{ kind: "guest", at: ago(5) }], NOW);
    expect(["quiet", "steady"]).toContain(one.level);
    const five: BusynessSignal[] = Array.from({ length: 5 }, (_, i) => ({
      kind: "guest",
      at: ago(5 + i * 3),
    }));
    const busy = computePulse(five, NOW);
    expect(["lively", "packed"]).toContain(busy.level);
  });

  it("freshness reflects the newest signal", () => {
    const p = computePulse(
      [
        { kind: "guest", at: ago(100) },
        { kind: "guest", at: ago(12) },
      ],
      NOW
    );
    expect(p.freshnessMinutes).toBe(12);
  });
});

describe("freshnessLabel", () => {
  it("formats freshness", () => {
    expect(freshnessLabel(null)).toBe("no signals yet");
    expect(freshnessLabel(1)).toBe("just now");
    expect(freshnessLabel(25)).toBe("as of 25 min ago");
    expect(freshnessLabel(130)).toBe("as of 2h ago");
  });
});

describe("canCheckIn", () => {
  it("enforces the 2-hour window", () => {
    expect(canCheckIn(null, NOW)).toBe(true);
    expect(canCheckIn(ago(30), NOW)).toBe(false);
    expect(canCheckIn(ago(121), NOW)).toBe(true);
  });
});

describe("demo venues", () => {
  it("every pilot area has at least one venue, all flagged demo names", () => {
    const venues = demoVenues(NOW);
    for (const areaId of ["highland-park", "eastvale", "fontana-southridge", "claremont"]) {
      expect(venues.some((v) => v.areaIds.includes(areaId)), areaId).toBe(true);
    }
    for (const v of venues) expect(v.name).toMatch(/\(demo\)/);
  });

  it("the offer↔pulse story holds: the taproom with the offer reports quiet", () => {
    const venues = demoVenues(NOW);
    const taproom = venues.find((v) => v.id === "venue-taproom")!;
    expect(taproom.offerId).toBe("demo-hlp-2");
    const merchant = taproom.signals.find((s) => s.kind === "merchant")!;
    expect(merchant.vibe).toBe("quiet");
  });
});
