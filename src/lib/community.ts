/**
 * Community services directory: types and validation. Pure logic — storage
 * lives behind /api/community (Supabase when configured, demo seeds
 * otherwise). See docs/specs/community-directory.md for the full trust &
 * safety plan this file implements. Unit-tested.
 */

export const SERVICE_CATEGORIES = ["babysitting", "pet-care", "handyman", "other"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  babysitting: "Babysitting & childcare",
  "pet-care": "Dog walking & pet care",
  handyman: "Handyman & home repair",
  other: "Other household help",
};

/** Public-facing listing — never carries contact info. See rule 5c. */
export interface ProviderListing {
  id: string;
  displayName: string;
  categories: ServiceCategory[];
  bio: string;
  experienceNote?: string;
  rateNote?: string;
  areaId: string;
  demo?: boolean;
}

export interface ProviderDraft {
  displayName: string;
  contactEmail: string;
  categories: string[];
  bio: string;
  experienceNote?: string;
  rateNote?: string;
  areaId: string;
}

export interface ContactRequestDraft {
  providerId: string;
  requesterName: string;
  requesterContact: string;
  message: string;
}

// Best-effort automated pre-filter, not the real gate — moderation review is
// the real gate (see spec). Keyword-based screen for discriminatory
// refusal-of-service language, the service-provider analog of the
// fair-housing rule applied elsewhere in the product.
const DISCRIMINATORY_REFUSAL = /\b(no (gays?|muslims?|jews?|christians?|blacks?|whites?|hispanics?|asians?|immigrants?|disabled|straight|trans(?:gender)?s?))\b/i;

export function validateProviderDraft(d: ProviderDraft): string[] {
  const errors: string[] = [];
  if (!d.displayName || d.displayName.trim().length < 2 || d.displayName.length > 40) {
    errors.push("Display name must be 2–40 characters.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.contactEmail ?? "")) {
    errors.push("A valid contact email is required (kept private, never shown publicly).");
  }
  const cats = (d.categories ?? []).filter((c): c is ServiceCategory =>
    (SERVICE_CATEGORIES as readonly string[]).includes(c)
  );
  if (cats.length === 0) errors.push("Choose at least one category.");
  if (!d.bio || d.bio.trim().length < 10 || d.bio.length > 400) {
    errors.push("Bio must be 10–400 characters.");
  }
  if (d.experienceNote && d.experienceNote.length > 200) {
    errors.push("Experience note must be 200 characters or fewer.");
  }
  if (d.rateNote && d.rateNote.length > 60) {
    errors.push("Rate note must be 60 characters or fewer.");
  }
  if (!d.areaId || d.areaId.trim().length === 0) {
    errors.push("A service area is required.");
  }
  if (DISCRIMINATORY_REFUSAL.test(`${d.bio} ${d.experienceNote ?? ""}`)) {
    errors.push("Listings can't state a refusal to serve people based on a protected characteristic.");
  }
  return errors;
}

export function validateContactRequest(d: ContactRequestDraft): string[] {
  const errors: string[] = [];
  if (!d.providerId || d.providerId.trim().length === 0) errors.push("Unknown provider.");
  if (!d.requesterName || d.requesterName.trim().length < 2 || d.requesterName.length > 60) {
    errors.push("Your name must be 2–60 characters.");
  }
  const contact = (d.requesterContact ?? "").trim();
  const looksLikeEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
  const looksLikePhone = /^[\d()+\-.\s]{7,20}$/.test(contact);
  if (!looksLikeEmail && !looksLikePhone) {
    errors.push("Enter a valid email or phone number so the provider can reply.");
  }
  if (!d.message || d.message.trim().length < 5 || d.message.length > 500) {
    errors.push("Message must be 5–500 characters.");
  }
  return errors;
}

export function providersForArea(providers: ProviderListing[], areaId: string): ProviderListing[] {
  return providers.filter((p) => p.areaId === areaId);
}

export function providersByCategory(
  providers: ProviderListing[]
): Partial<Record<ServiceCategory, ProviderListing[]>> {
  const out: Partial<Record<ServiceCategory, ProviderListing[]>> = {};
  for (const p of providers) {
    for (const c of p.categories) {
      (out[c] ??= []).push(p);
    }
  }
  return out;
}
