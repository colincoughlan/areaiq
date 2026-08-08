import { describe, expect, it } from "vitest";
import { demoOffers } from "./demo-offers";
import {
  offersForArea,
  timeLeftLabel,
  validateOfferDraft,
  type Offer,
  type OfferDraft,
} from "./offers";

const NOW = new Date("2026-08-07T18:00:00Z");

function draft(over: Partial<OfferDraft> = {}): OfferDraft {
  return {
    businessName: "Ave 57 Coffee",
    contactEmail: "owner@ave57.com",
    title: "20% off any drink today",
    category: "coffee",
    discountLabel: "20% off",
    address: "5960 Monterey Rd, Los Angeles",
    lat: 34.111,
    lng: -118.192,
    radiusMiles: 2,
    expiresAt: new Date(NOW.getTime() + 6 * 3_600_000).toISOString(),
    ...over,
  };
}

describe("validateOfferDraft", () => {
  it("accepts a valid draft", () => {
    expect(validateOfferDraft(draft(), NOW)).toEqual([]);
  });

  it("rejects past and too-long expiries", () => {
    expect(validateOfferDraft(draft({ expiresAt: "2026-08-07T17:00:00Z" }), NOW).join()).toMatch(/future/);
    expect(
      validateOfferDraft(
        draft({ expiresAt: new Date(NOW.getTime() + 8 * 86_400_000).toISOString() }),
        NOW
      ).join()
    ).toMatch(/at most 7 days/);
  });

  it("rejects oversized radius, bad category, bad email, short title", () => {
    expect(validateOfferDraft(draft({ radiusMiles: 6 }), NOW).join()).toMatch(/Radius/);
    expect(validateOfferDraft(draft({ category: "housing" }), NOW).join()).toMatch(/category/);
    expect(validateOfferDraft(draft({ contactEmail: "nope" }), NOW).join()).toMatch(/email/);
    expect(validateOfferDraft(draft({ title: "Hi" }), NOW).join()).toMatch(/5 characters/);
  });

  it("blocks housing/lending/employment content (product rule)", () => {
    expect(
      validateOfferDraft(draft({ title: "Apartment for rent special deal" }), NOW).join()
    ).toMatch(/not permitted/);
    expect(validateOfferDraft(draft({ details: "We are hiring too!" }), NOW).join()).toMatch(
      /not permitted/
    );
  });
});

describe("offersForArea", () => {
  const center = { lat: 34.111, lng: -118.192 };
  const base: Offer = {
    id: "1",
    businessName: "B",
    title: "T-title",
    category: "food",
    discountLabel: "10% off",
    address: "A",
    lat: 34.115,
    lng: -118.195,
    radiusMiles: 2,
    startsAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
    expiresAt: new Date(NOW.getTime() + 3_600_000).toISOString(),
  };

  it("includes nearby active offers with distance, sorted by soonest expiry", () => {
    const later = { ...base, id: "2", expiresAt: new Date(NOW.getTime() + 7_200_000).toISOString() };
    const res = offersForArea([later, base], center, NOW);
    expect(res.map((o) => o.id)).toEqual(["1", "2"]);
    expect(res[0].distanceMiles).toBeLessThan(0.5);
  });

  it("excludes expired, not-yet-started, and out-of-radius offers", () => {
    const expired = { ...base, id: "x", expiresAt: new Date(NOW.getTime() - 1000).toISOString() };
    const future = { ...base, id: "f", startsAt: new Date(NOW.getTime() + 3_600_000).toISOString() };
    const far = { ...base, id: "far", lat: 34.3, lng: -118.5 }; // ~20 mi
    expect(offersForArea([expired, future, far], center, NOW)).toHaveLength(0);
  });
});

describe("demo offers", () => {
  it("every pilot area has at least one active demo offer", () => {
    const now = new Date();
    const offers = demoOffers(now);
    const centers: [string, number, number][] = [
      ["highland-park", 34.111, -118.192],
      ["eastvale", 33.963, -117.564],
      ["fontana-southridge", 34.057, -117.462],
      ["claremont", 34.0967, -117.7198],
    ];
    for (const [id, lat, lng] of centers) {
      expect(offersForArea(offers, { lat, lng }, now).length, id).toBeGreaterThan(0);
    }
  });

  it("demo offers are flagged and use fictional names", () => {
    for (const o of demoOffers()) {
      expect(o.demo).toBe(true);
      expect(o.businessName).toMatch(/\(demo\)/);
    }
  });
});

describe("timeLeftLabel", () => {
  it("formats remaining time", () => {
    expect(timeLeftLabel(new Date(NOW.getTime() + 30 * 60_000).toISOString(), NOW)).toBe("30 min left");
    expect(timeLeftLabel(new Date(NOW.getTime() + 5 * 3_600_000).toISOString(), NOW)).toBe("5h left");
    expect(timeLeftLabel(new Date(NOW.getTime() + 30 * 3_600_000).toISOString(), NOW)).toBe("1d 6h left");
    expect(timeLeftLabel(new Date(NOW.getTime() - 1000).toISOString(), NOW)).toBe("expired");
  });
});
