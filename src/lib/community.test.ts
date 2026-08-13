import { describe, expect, it } from "vitest";
import {
  providersByCategory,
  providersForArea,
  validateContactRequest,
  validateProviderDraft,
  type ProviderDraft,
  type ProviderListing,
} from "./community";

function draft(overrides: Partial<ProviderDraft> = {}): ProviderDraft {
  return {
    displayName: "Jamie",
    contactEmail: "jamie@example.com",
    categories: ["babysitting"],
    bio: "Experienced sitter, weekends and evenings, references available.",
    areaId: "highland-park",
    ...overrides,
  };
}

describe("validateProviderDraft", () => {
  it("accepts a well-formed draft", () => {
    expect(validateProviderDraft(draft())).toEqual([]);
  });

  it("requires a valid, private contact email", () => {
    expect(validateProviderDraft(draft({ contactEmail: "not-an-email" }))).toContain(
      "A valid contact email is required (kept private, never shown publicly)."
    );
  });

  it("requires at least one valid category", () => {
    expect(validateProviderDraft(draft({ categories: [] }))).toContain("Choose at least one category.");
    expect(validateProviderDraft(draft({ categories: ["not-a-real-category"] }))).toContain(
      "Choose at least one category."
    );
  });

  it("enforces bio length bounds", () => {
    expect(validateProviderDraft(draft({ bio: "too short" }))).toContain("Bio must be 10–400 characters.");
    expect(validateProviderDraft(draft({ bio: "x".repeat(401) }))).toContain("Bio must be 10–400 characters.");
  });

  it("requires a service area", () => {
    expect(validateProviderDraft(draft({ areaId: "" }))).toContain("A service area is required.");
  });

  it("rejects discriminatory refusal-of-service language in bio or experience note", () => {
    const errors = validateProviderDraft(draft({ bio: "Reliable sitter, no Muslims please, flexible hours." }));
    expect(errors).toContain("Listings can't state a refusal to serve people based on a protected characteristic.");
  });

  it("does not flag ordinary bios containing unrelated words", () => {
    // sanity check the regex isn't overly broad
    expect(validateProviderDraft(draft({ bio: "I love walking dogs of all breeds and sizes around the block." }))).toEqual(
      []
    );
  });
});

describe("validateContactRequest", () => {
  const base = {
    providerId: "p1",
    requesterName: "Alex",
    requesterContact: "alex@example.com",
    message: "Hi, are you available Saturday morning?",
  };

  it("accepts a well-formed request with email contact", () => {
    expect(validateContactRequest(base)).toEqual([]);
  });

  it("accepts a phone number as contact", () => {
    expect(validateContactRequest({ ...base, requesterContact: "(555) 123-4567" })).toEqual([]);
  });

  it("rejects an invalid contact", () => {
    expect(validateContactRequest({ ...base, requesterContact: "not valid" })).toContain(
      "Enter a valid email or phone number so the provider can reply."
    );
  });

  it("rejects a missing provider id", () => {
    expect(validateContactRequest({ ...base, providerId: "" })).toContain("Unknown provider.");
  });

  it("enforces message length bounds", () => {
    expect(validateContactRequest({ ...base, message: "hi" })).toContain("Message must be 5–500 characters.");
  });
});

describe("providersForArea / providersByCategory", () => {
  const providers: ProviderListing[] = [
    { id: "1", displayName: "A", categories: ["babysitting"], bio: "b1", areaId: "highland-park" },
    { id: "2", displayName: "B", categories: ["pet-care", "handyman"], bio: "b2", areaId: "highland-park" },
    { id: "3", displayName: "C", categories: ["handyman"], bio: "b3", areaId: "eastvale" },
  ];

  it("filters by area", () => {
    expect(providersForArea(providers, "highland-park").map((p) => p.id)).toEqual(["1", "2"]);
    expect(providersForArea(providers, "eastvale").map((p) => p.id)).toEqual(["3"]);
  });

  it("groups by category, including providers with multiple categories", () => {
    const byCat = providersByCategory(providers);
    expect(byCat.babysitting?.map((p) => p.id)).toEqual(["1"]);
    expect(byCat["pet-care"]?.map((p) => p.id)).toEqual(["2"]);
    expect(byCat.handyman?.map((p) => p.id)).toEqual(["2", "3"]);
  });
});
