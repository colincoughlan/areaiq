/**
 * Demo offers shown when Supabase isn't configured — they make the feature
 * tangible for testers. All businesses are FICTIONAL and offers are labeled
 * demo in the UI. Expiries are generated relative to "now" so the countdown
 * experience always works.
 */

import type { Offer } from "./offers";

const H = 3_600_000;

export function demoOffers(now = new Date()): Offer[] {
  const t = now.getTime();
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    // Highland Park cluster
    {
      id: "demo-hlp-1",
      businessName: "Avenue 57 Coffee Co. (demo)",
      title: "Afternoon pick-me-up: 20% off any drink today",
      details: "New neighborhood roaster saying hello. Show this offer at the counter.",
      category: "coffee",
      discountLabel: "20% off",
      address: "York Blvd, Highland Park",
      lat: 34.1195,
      lng: -118.1865,
      radiusMiles: 2,
      startsAt: iso(t - 2 * H),
      expiresAt: iso(t + 5 * H),
      demo: true,
    },
    {
      id: "demo-hlp-2",
      businessName: "Monterey Taproom (demo)",
      title: "Quiet Tuesday: 30% off food tonight 6–9pm",
      details: "Kitchen's open, seats are empty — neighbors eat first.",
      category: "drink",
      discountLabel: "30% off",
      address: "Monterey Rd, Highland Park",
      lat: 34.1105,
      lng: -118.1935,
      radiusMiles: 1.5,
      startsAt: iso(t - 1 * H),
      expiresAt: iso(t + 8 * H),
      demo: true,
    },
    {
      id: "demo-hlp-3",
      businessName: "Figueroa Vintage (demo)",
      title: "One-day 25% off everything in store",
      category: "retail",
      discountLabel: "25% off",
      address: "N Figueroa St, Highland Park",
      lat: 34.1078,
      lng: -118.1972,
      radiusMiles: 2,
      startsAt: iso(t - 3 * H),
      expiresAt: iso(t + 20 * H),
      demo: true,
    },
    // Eastvale
    {
      id: "demo-eas-1",
      businessName: "The Station Grill (demo)",
      title: "Family night: kids eat free with any entrée",
      category: "food",
      discountLabel: "Kids free",
      address: "The Station, Eastvale",
      lat: 33.9748,
      lng: -117.5515,
      radiusMiles: 3,
      startsAt: iso(t - 2 * H),
      expiresAt: iso(t + 30 * H),
      demo: true,
    },
    // Fontana
    {
      id: "demo-fon-1",
      businessName: "Southridge Fitness (demo)",
      title: "First month $10 for Southridge neighbors",
      category: "fitness",
      discountLabel: "$10 first month",
      address: "Sierra Ave, Fontana",
      lat: 34.0605,
      lng: -117.4665,
      radiusMiles: 3,
      startsAt: iso(t - 5 * H),
      expiresAt: iso(t + 48 * H),
      demo: true,
    },
    // Claremont
    {
      id: "demo-cla-1",
      businessName: "Village Corner Café (demo)",
      title: "Rainy-day special: free pastry with any coffee",
      category: "coffee",
      discountLabel: "Free pastry",
      address: "Claremont Village",
      lat: 34.0952,
      lng: -117.7202,
      radiusMiles: 2,
      startsAt: iso(t - 1 * H),
      expiresAt: iso(t + 6 * H),
      demo: true,
    },
  ];
}
