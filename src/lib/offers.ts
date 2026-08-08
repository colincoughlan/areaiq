/**
 * Local Offers: types, validation, and geo/expiry filtering. Pure logic —
 * storage lives behind /api/offers (Supabase when configured, demo seeds
 * otherwise). Unit-tested.
 */

import { haversineMiles } from "./schools";

export const OFFER_CATEGORIES = [
  "food",
  "drink",
  "coffee",
  "retail",
  "fitness",
  "services",
  "other",
] as const;

export type OfferCategory = (typeof OFFER_CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<OfferCategory, string> = {
  food: "🍽️",
  drink: "🍸",
  coffee: "☕",
  retail: "🛍️",
  fitness: "💪",
  services: "🧰",
  other: "📍",
};

export interface Offer {
  id: string;
  businessName: string;
  title: string;
  details?: string;
  category: OfferCategory;
  discountLabel: string; // "20% off", "BOGO", "$5 off"
  address: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  startsAt: string; // ISO
  expiresAt: string; // ISO
  demo?: boolean;
}

export interface OfferDraft {
  businessName: string;
  contactEmail: string;
  title: string;
  details?: string;
  category: string;
  discountLabel: string;
  address: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  expiresAt: string;
}

export const MAX_OFFER_DAYS = 7;
export const MAX_RADIUS_MILES = 5;

export function validateOfferDraft(d: OfferDraft, now = new Date()): string[] {
  const errors: string[] = [];
  if (!d.businessName || d.businessName.trim().length < 2) errors.push("Business name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.contactEmail ?? "")) errors.push("A valid contact email is required.");
  if (!d.title || d.title.trim().length < 5) errors.push("Offer title must be at least 5 characters.");
  if (d.title && d.title.length > 90) errors.push("Offer title must be 90 characters or fewer.");
  if (d.details && d.details.length > 280) errors.push("Details must be 280 characters or fewer.");
  if (!OFFER_CATEGORIES.includes(d.category as OfferCategory)) errors.push("Choose a valid category.");
  if (!d.discountLabel || d.discountLabel.trim().length < 2) errors.push("Discount label is required (e.g. \"20% off\").");
  if (!d.address || d.address.trim().length < 5) errors.push("Business address is required.");
  if (!Number.isFinite(d.lat) || !Number.isFinite(d.lng)) errors.push("Location coordinates are required.");
  if (!(d.radiusMiles > 0) || d.radiusMiles > MAX_RADIUS_MILES) {
    errors.push(`Radius must be between 0 and ${MAX_RADIUS_MILES} miles.`);
  }
  const exp = new Date(d.expiresAt);
  if (Number.isNaN(exp.getTime()) || exp <= now) {
    errors.push("Expiry must be in the future.");
  } else if (exp.getTime() - now.getTime() > MAX_OFFER_DAYS * 86_400_000) {
    errors.push(`Offers can run at most ${MAX_OFFER_DAYS} days.`);
  }
  // The same content screen used across the product.
  const banned = /\b(housing|apartment for rent|lease|loan|mortgage|hiring|job offer)\b/i;
  if (banned.test(`${d.title} ${d.details ?? ""}`)) {
    errors.push("Housing, lending, and employment offers are not permitted.");
  }
  return errors;
}

/** Offers live for viewers of an area: active now, and the area center falls inside the offer's radius. */
export function offersForArea(
  offers: Offer[],
  center: { lat: number; lng: number },
  now = new Date()
): (Offer & { distanceMiles: number })[] {
  return offers
    .filter((o) => new Date(o.expiresAt) > now && new Date(o.startsAt) <= now)
    .map((o) => ({
      ...o,
      distanceMiles: Math.round(haversineMiles(center.lat, center.lng, o.lat, o.lng) * 10) / 10,
    }))
    .filter((o) => o.distanceMiles <= o.radiusMiles)
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
}

export function timeLeftLabel(expiresAt: string, now = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min left`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
}
