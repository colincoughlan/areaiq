/**
 * Demo provider listings shown when Supabase isn't configured — they make
 * the feature tangible for testers. All people are FICTIONAL and listings
 * are labeled demo in the UI. Contact info is intentionally absent even
 * here, matching the real (mediated-contact-only) behavior.
 */

import type { ProviderListing } from "./community";

export function demoProviders(): ProviderListing[] {
  return [
    {
      id: "demo-hlp-1",
      displayName: "Sam R. (demo)",
      categories: ["babysitting"],
      bio: "College student, evenings and weekends, CPR certified, great with toddlers and school-age kids.",
      experienceNote: "3 years, CPR certified (self-reported)",
      rateNote: "$18–22/hr",
      areaId: "highland-park",
      demo: true,
    },
    {
      id: "demo-hlp-2",
      displayName: "Marisol T. (demo)",
      categories: ["pet-care"],
      bio: "Daily dog walks and drop-in visits, comfortable with big and reactive dogs, flexible schedule.",
      experienceNote: "5 years dog walking (self-reported)",
      rateNote: "$20/walk",
      areaId: "highland-park",
      demo: true,
    },
    {
      id: "demo-hlp-3",
      displayName: "Dave K. (demo)",
      categories: ["handyman"],
      bio: "General repairs, furniture assembly, TV mounting, small drywall patches. Own tools and truck.",
      experienceNote: "10+ years handyman work (self-reported)",
      rateNote: "$45/hr, 1hr minimum",
      areaId: "highland-park",
      demo: true,
    },
    {
      id: "demo-eas-1",
      displayName: "Priya N. (demo)",
      categories: ["babysitting", "pet-care"],
      bio: "Nanny by day, happy to also walk your dog on the same visit. Nonsmoker, has a car.",
      experienceNote: "4 years childcare (self-reported)",
      rateNote: "$20/hr",
      areaId: "eastvale",
      demo: true,
    },
    {
      id: "demo-fon-1",
      displayName: "Robert G. (demo)",
      categories: ["handyman"],
      bio: "Retired contractor, small jobs only — fence repair, gutter cleaning, light electrical.",
      experienceNote: "Licensed contractor for 25 years, now doing small jobs only (self-reported)",
      areaId: "fontana-southridge",
      demo: true,
    },
    {
      id: "demo-cla-1",
      displayName: "Emily W. (demo)",
      categories: ["pet-care"],
      bio: "Cat sitting and dog walks around the Village, available most mornings.",
      rateNote: "$15/visit",
      areaId: "claremont",
      demo: true,
    },
  ];
}
