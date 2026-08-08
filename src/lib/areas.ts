import type { Area, Confidence, Sourced, SourceKind } from "./types";

/**
 * Phase 1 pilot-area data. ALL FIGURES ARE ILLUSTRATIVE SAMPLE DATA used to
 * validate the product experience before live pipelines exist (Phase 2).
 * The UI must label them as such.
 */

const RETRIEVED = "2026-08-01";

function s<T>(
  value: T,
  sourceName: string,
  source: SourceKind = "sample-data",
  confidence: Confidence = "medium"
): Sourced<T> {
  return { value, source, sourceName, retrievedAt: RETRIEVED, confidence };
}

export const AREAS: Record<string, Area> = {
  "highland-park": {
    id: "highland-park",
    name: "Highland Park",
    county: "Los Angeles County",
    sampleAddress: "5960 Monterey Rd, Los Angeles, CA 90042",
    lat: 34.111,
    lng: -118.192,
    zoom: 14,
    direction: "improving",
    directionDetail:
      "Sustained permit activity, rising owner investment, new transit-adjacent projects",
    riskHeadline: "Moderate fire risk on hillside edges (CAL FIRE FHSZ)",
    scores: { dailyLife: 82, housing: 61, futureScore: 78, confidence: "high" },
    strengths: [
      "Walkable commercial corridors on York Blvd and Figueroa St with strong independent retail",
      "Metro A Line access at Highland Park station — direct rail to DTLA and Pasadena",
      "High permit activity: 240+ residential permits filed in the past 24 months",
    ],
    tradeoffs: [
      "Median home price well above county median; affordability pressure on long-time renters",
      "Renter share (58%) above county average; displacement concerns raised in council testimony",
      "Older housing stock — 71% of units built before 1960; renovation costs are common",
    ],
    narrative:
      "Highland Park is a transitioning northeast LA neighborhood with a strong walkable core, active independent retail and direct rail access. Investment indicators point upward: permit filings are well above the citywide per-capita rate and two significant projects sit near the transit station. The main tradeoffs are affordability and change itself.",
    changing:
      "Permit activity is concentrated within a half-mile of the A Line station. The approved Avenue 57 Transit Village (128 homes) is the largest single project in a decade. Retail turnover on York Blvd continues toward food and specialty retail.",
    housing: {
      ownerOccupied: s("42%", "U.S. Census ACS 5-year (sample)"),
      renterOccupied: s("58%", "U.S. Census ACS 5-year (sample)"),
      vacancy: s("4.1%", "U.S. Census ACS 5-year (sample)", "sample-data", "limited"),
      medianPrice: s("$1,050,000", "Illustrative — production uses licensed sales data"),
      housingAge: s("71% pre-1960", "U.S. Census ACS 5-year (sample)"),
      permits24mo: s("243", "LA City permit records (sample)"),
    },
    schools: [
      { name: "Buchanan Street Elementary", district: "LAUSD", note: "Enrollment 412 · dual-language program" },
      { name: "Franklin High School", district: "LAUSD", note: "Enrollment 1,720 · magnet programs" },
    ],
    amenitiesSummary:
      "Grocery within 0.4 mi · 30+ restaurants within 1 mi · 3 parks · library · 2 pharmacies",
    amenityDetail: [
      ["Grocery stores within 1 mi", "4"],
      ["Restaurants & cafés within 1 mi", "30+"],
      ["Parks within 1 mi", "3 (incl. Highland Park Rec Center)"],
      ["Library", "Arroyo Seco Regional (0.7 mi)"],
      ["Healthcare", "2 urgent-care clinics within 1.5 mi"],
    ],
    mobility:
      "Metro A Line (rail) · frequent bus on Figueroa · walk-friendly core, hillside streets less so · ~35 min transit to DTLA",
    environment:
      "Portions of hillside blocks fall in a CAL FIRE Very High Fire Hazard Severity Zone. Flood risk minimal (FEMA Zone X). Air quality typical for central LA basin.",
    projects: [
      {
        name: "Avenue 57 Transit Village",
        type: "Mixed-use residential",
        status: "approved",
        size: "128 homes + ground-floor retail",
        dates: "Filed Mar 2024 · Approved Jan 2026",
        agency: "Private developer / LA City Planning",
        lat: 34.1093,
        lng: -118.1978,
        possibleEffects:
          "Likely increases foot traffic and transit ridership near the station; construction impacts on Ave 57 expected for ~18 months.",
      },
      {
        name: "York Blvd Complete Streets",
        type: "Public infrastructure",
        status: "under-construction",
        size: "1.6-mile corridor upgrade",
        dates: "Funded 2024 · Est. completion late 2026",
        agency: "LADOT",
        lat: 34.1189,
        lng: -118.1866,
        possibleEffects:
          "Adds protected bike lanes and pedestrian crossings; temporary lane closures during works.",
      },
      {
        name: "Monterey Rd Small-Lot Homes",
        type: "Residential",
        status: "proposed",
        size: "14 small-lot homes",
        dates: "Filed Nov 2025 · In review",
        agency: "Private developer",
        lat: 34.1128,
        lng: -118.1889,
        possibleEffects: "Modest density increase; neighbors have filed comments about parking.",
      },
    ],
    mapPoints: [
      { lat: 34.117, lng: -118.184, label: "Buchanan Street Elementary", kind: "school" },
      { lat: 34.104, lng: -118.187, label: "Franklin High School", kind: "school" },
      { lat: 34.114, lng: -118.196, label: "Grocery", kind: "amenity" },
      { lat: 34.107, lng: -118.199, label: "Highland Park Rec Center", kind: "amenity" },
      { lat: 34.112, lng: -118.183, label: "Metro A Line — Highland Park", kind: "transit" },
    ],
  },

  eastvale: {
    id: "eastvale",
    name: "Eastvale",
    county: "Riverside County",
    sampleAddress: "13380 Citrus St, Eastvale, CA 92880",
    lat: 33.963,
    lng: -117.564,
    zoom: 13,
    direction: "growing-rapidly",
    directionDetail:
      "Sustained residential construction, major logistics employment nearby, new civic facilities",
    riskHeadline: "Air quality: warehouse truck corridors nearby (CARB)",
    scores: { dailyLife: 71, housing: 84, futureScore: 81, confidence: "high" },
    strengths: [
      "One of the highest owner-occupancy rates in the region (81%) with newer housing stock",
      "The Station mixed-use district adding retail, dining and civic space through 2027",
      "Strong household formation: population has more than doubled since incorporation (2010)",
    ],
    tradeoffs: [
      "Long car commutes for LA/OC workers — limited transit; 71% drive alone, median commute 38 min",
      "Warehouse growth on the city's edges brings truck traffic on Hamner Ave and Cantu-Galleano",
      "Amenity depth still maturing — fewer dining and culture options than established suburbs",
    ],
    narrative:
      "Eastvale is a young, fast-growing Riverside County city defined by high owner-occupancy, new housing stock and family-oriented suburban form. The city is mid-way through building its first true town center, and logistics employment surrounds it. The core tradeoff is classic Inland Empire: more house for the money, in exchange for long car commutes and warehouse-adjacent truck traffic.",
    changing:
      "Residential construction continues at one of the fastest per-capita rates in the five-county region. The Station district will change the city's center of gravity, while approved warehouse projects on the east side are the main source of land-use conflict.",
    housing: {
      ownerOccupied: s("81%", "U.S. Census ACS 5-year (sample)"),
      renterOccupied: s("19%", "U.S. Census ACS 5-year (sample)"),
      vacancy: s("2.8%", "U.S. Census ACS 5-year (sample)", "sample-data", "limited"),
      medianPrice: s("$780,000", "Illustrative — production uses licensed sales data"),
      housingAge: s("92% post-2000", "U.S. Census ACS 5-year (sample)"),
      permits24mo: s("510", "City of Eastvale permit records (sample)"),
    },
    schools: [
      { name: "Eastvale Elementary", district: "Corona-Norco USD", note: "Enrollment 890 · newer campus" },
      { name: "Eleanor Roosevelt High School", district: "Corona-Norco USD", note: "Enrollment 3,400 · broad AP program" },
    ],
    amenitiesSummary:
      "Big-box retail hub at Eastvale Gateway · 12 parks · community center · limited nightlife",
    amenityDetail: [
      ["Grocery stores within 2 mi", "6"],
      ["Restaurants within 2 mi", "40+ (mostly chain)"],
      ["Parks in city", "12"],
      ["Library", "Eastvale Branch (new, at The Station)"],
      ["Healthcare", "Kaiser & urgent care within 4 mi"],
    ],
    mobility:
      "Car-dependent · SR-91/I-15 access · Metrolink at Corona (15 min drive) · 38 min median commute",
    environment:
      "Adjacent logistics corridors elevate diesel particulate exposure on eastern edges (CARB monitoring). Flood risk low in most tracts. Fire risk low.",
    projects: [
      {
        name: "The Station District Phase 2",
        type: "Mixed-use town center",
        status: "under-construction",
        size: "420 homes + 250k sq ft retail/civic",
        dates: "Approved 2023 · Phases through 2027",
        agency: "Lewis Group / City of Eastvale",
        lat: 33.9755,
        lng: -117.551,
        possibleEffects:
          "Creates the city's first walkable core; expect retail options to expand significantly.",
      },
      {
        name: "Cantu-Galleano Logistics Center",
        type: "Industrial / warehouse",
        status: "approved",
        size: "1.2M sq ft",
        dates: "Approved Sep 2025",
        agency: "Private developer / City of Eastvale",
        lat: 33.988,
        lng: -117.539,
        possibleEffects:
          "Adds jobs but increases heavy-truck trips on arterials; residents have raised air-quality concerns.",
      },
      {
        name: "Limonite Ave Widening",
        type: "Public infrastructure",
        status: "under-construction",
        size: "Interchange + arterial widening",
        dates: "Est. completion 2026",
        agency: "Riverside County Transportation",
        lat: 33.974,
        lng: -117.573,
        possibleEffects:
          "Should relieve the worst peak congestion at I-15; construction delays in the interim.",
      },
    ],
    mapPoints: [
      { lat: 33.969, lng: -117.556, label: "Eastvale Elementary", kind: "school" },
      { lat: 33.956, lng: -117.559, label: "Eleanor Roosevelt High School", kind: "school" },
      { lat: 33.966, lng: -117.568, label: "Eastvale Gateway retail", kind: "amenity" },
      { lat: 33.959, lng: -117.571, label: "Community park", kind: "amenity" },
      { lat: 33.964, lng: -117.555, label: "Bus stop (illustrative)", kind: "transit" },
    ],
  },

  "fontana-southridge": {
    id: "fontana-southridge",
    name: "Fontana (Southridge)",
    county: "San Bernardino County",
    sampleAddress: "14850 Live Oak Ave, Fontana, CA 92337",
    lat: 34.057,
    lng: -117.462,
    zoom: 13,
    direction: "improving",
    directionDetail:
      "Public investment in parks and civic facilities; steady housing construction; warehouse expansion continues",
    riskHeadline: "Air quality & truck traffic: significant logistics exposure (CalEnviroScreen)",
    scores: { dailyLife: 58, housing: 72, futureScore: 66, confidence: "medium" },
    strengths: [
      "Among the most affordable entry points in the study set — median well below county-adjacent markets",
      "Substantial public investment: new aquatic center funded, two park renovations underway",
      "Steady residential construction and first-time-buyer activity in south Fontana tracts",
    ],
    tradeoffs: [
      "Heavy logistics footprint — warehouse clusters generate truck traffic on Sierra and Jurupa Ave",
      "Air-quality burden above regional average on multiple CARB indicators",
      "Retail and dining depth limited; many trips require driving to Ontario or Rancho Cucamonga",
    ],
    narrative:
      "South Fontana offers one of the region's more affordable ownership entry points, and the city is visibly investing in parks and civic facilities. The dominant tradeoff is the logistics economy around it: warehouses bring jobs and tax base, but also truck traffic and an air-quality burden that ranks high on state environmental screens.",
    changing:
      "Public capital spending is rising (aquatic center, park renovations), attached housing is being built at entry price points, and a major warehouse expansion is in environmental review with active community opposition — its outcome will shape the area's trajectory.",
    housing: {
      ownerOccupied: s("64%", "U.S. Census ACS 5-year (sample)"),
      renterOccupied: s("36%", "U.S. Census ACS 5-year (sample)"),
      vacancy: s("3.5%", "U.S. Census ACS 5-year (sample)", "sample-data", "limited"),
      medianPrice: s("$615,000", "Illustrative — production uses licensed sales data"),
      housingAge: s("58% post-1990", "U.S. Census ACS 5-year (sample)"),
      permits24mo: s("310", "City of Fontana permit records (sample)"),
    },
    schools: [
      { name: "Live Oak Elementary", district: "Fontana USD", note: "Enrollment 640" },
      { name: "Jurupa Hills High School", district: "Fontana USD", note: "Enrollment 2,100 · newer campus" },
    ],
    amenitiesSummary:
      "Neighborhood retail on Sierra Ave · regional shopping 10–15 min away · parks improving",
    amenityDetail: [
      ["Grocery stores within 2 mi", "3"],
      ["Restaurants within 2 mi", "20+"],
      ["Parks within 2 mi", "4 (2 under renovation)"],
      ["Library", "Fontana Lewis Library (4 mi)"],
      ["Healthcare", "Kaiser Fontana Medical Center (5 mi)"],
    ],
    mobility:
      "Car-dependent · I-10/SR-60 access · Metrolink Fontana station (San Bernardino Line) · 34 min median commute",
    environment:
      "Multiple census tracts score in the top quartile statewide for diesel particulate (CalEnviroScreen). Flood risk localized near flood-control channels. Fire risk low in the flats.",
    projects: [
      {
        name: "Southridge Aquatic & Community Center",
        type: "Public facility",
        status: "approved",
        size: "$38M civic investment",
        dates: "Funded FY2025-26 · Groundbreaking est. 2026",
        agency: "City of Fontana",
        lat: 34.053,
        lng: -117.468,
        possibleEffects:
          "Meaningful amenity upgrade for south Fontana; construction traffic during works.",
      },
      {
        name: "West Valley Logistics Phase 3",
        type: "Industrial / warehouse",
        status: "proposed",
        size: "2.1M sq ft across 3 buildings",
        dates: "Filed Feb 2026 · EIR in progress",
        agency: "Private developer",
        lat: 34.045,
        lng: -117.451,
        possibleEffects:
          "Would add jobs and truck trips; drawing organized community opposition on air-quality grounds.",
      },
      {
        name: "Sierra Ave Corridor Housing",
        type: "Residential",
        status: "under-construction",
        size: "190 townhomes",
        dates: "Approved 2024 · First units 2026",
        agency: "Private developer",
        lat: 34.066,
        lng: -117.47,
        possibleEffects:
          "Adds attached ownership product at lower price points than detached stock.",
      },
    ],
    mapPoints: [
      { lat: 34.061, lng: -117.457, label: "Live Oak Elementary", kind: "school" },
      { lat: 34.05, lng: -117.455, label: "Jurupa Hills High School", kind: "school" },
      { lat: 34.06, lng: -117.466, label: "Sierra Ave retail", kind: "amenity" },
      { lat: 34.052, lng: -117.471, label: "Southridge Park", kind: "amenity" },
      { lat: 34.064, lng: -117.451, label: "Metrolink Fontana (illustrative)", kind: "transit" },
    ],
  },

  claremont: {
    id: "claremont",
    name: "Claremont",
    county: "Los Angeles County",
    sampleAddress: "450 W 8th St, Claremont, CA 91711",
    lat: 34.0967,
    lng: -117.7198,
    zoom: 14,
    direction: "stable",
    directionDetail: "Mature, slow-change market; modest infill near the Village and transit",
    riskHeadline: "Fire risk elevated in northern foothill tracts (CAL FIRE FHSZ)",
    scores: { dailyLife: 88, housing: 69, futureScore: 58, confidence: "high" },
    strengths: [
      "Exceptional daily-life amenities: walkable Village, weekly farmers market, mature tree canopy",
      "Metrolink station in the Village core; A Line extension under construction to Pomona nearby",
      "The Claremont Colleges anchor stable employment, culture and event programming",
    ],
    tradeoffs: [
      "Premium pricing — highest entry cost in the pilot set; limited inventory turnover",
      "Slow development pipeline: few new homes approved; supply pressure keeps prices high",
      "Northern tracts carry elevated wildfire hazard designations",
    ],
    narrative:
      "Claremont is the premium, slow-change comparison in the pilot set: a mature college town with the strongest daily-life amenities of the four areas, rail transit in its core, and correspondingly high prices. Its future direction is stability rather than transformation.",
    changing:
      "Change is modest and planned: Village South build-out is the main pipeline, the A Line extension improves regional rail one stop away in Pomona, and small infill projects face detailed design review. Buyers should expect low supply growth and continued price pressure.",
    housing: {
      ownerOccupied: s("68%", "U.S. Census ACS 5-year (sample)"),
      renterOccupied: s("32%", "U.S. Census ACS 5-year (sample)"),
      vacancy: s("3.9%", "U.S. Census ACS 5-year (sample)", "sample-data", "limited"),
      medianPrice: s("$1,120,000", "Illustrative — production uses licensed sales data"),
      housingAge: s("64% pre-1980", "U.S. Census ACS 5-year (sample)"),
      permits24mo: s("85", "City of Claremont permit records (sample)"),
    },
    schools: [
      { name: "Sycamore Elementary", district: "Claremont USD", note: "Enrollment 430" },
      { name: "Claremont High School", district: "Claremont USD", note: "Enrollment 2,300 · strong academic reputation" },
    ],
    amenitiesSummary:
      "Claremont Village: 60+ shops/restaurants · farmers market · Colleges cultural venues · extensive parks",
    amenityDetail: [
      ["Grocery stores within 1 mi", "3 (incl. specialty)"],
      ["Restaurants & cafés in Village", "60+"],
      ["Parks in city", "24 + Thompson Creek Trail"],
      ["Library", "Claremont Helen Renwick (Village)"],
      ["Healthcare", "Multiple clinics; hospitals in Pomona (3 mi)"],
    ],
    mobility:
      "Metrolink San Bernardino Line in Village · A Line extension reaching Pomona (1 stop away) · walkable core · 33 min median commute",
    environment:
      "Northern foothill tracts in CAL FIRE Very High Fire Hazard Severity Zones. Flood risk low. Air quality better than Inland Empire average but still SCAQMD non-attainment region.",
    projects: [
      {
        name: "Village South Specific Plan build-out",
        type: "Mixed-use residential",
        status: "approved",
        size: "Up to 1,000 homes long-term (phased)",
        dates: "Plan adopted 2021 · First phase in design",
        agency: "City of Claremont",
        lat: 34.0925,
        lng: -117.7215,
        possibleEffects:
          "Largest change vector in the city; would add walkable housing south of the Village over many years.",
      },
      {
        name: "Foothill Blvd Median & Bike Improvements",
        type: "Public infrastructure",
        status: "under-construction",
        size: "Corridor safety project",
        dates: "Est. completion 2026",
        agency: "City of Claremont",
        lat: 34.107,
        lng: -117.718,
        possibleEffects: "Improves bike and pedestrian safety on the historic Route 66 corridor.",
      },
      {
        name: "Base Line Rd Townhomes",
        type: "Residential",
        status: "proposed",
        size: "42 townhomes",
        dates: "Filed Jan 2026 · In review",
        agency: "Private developer",
        lat: 34.121,
        lng: -117.715,
        possibleEffects:
          "Small infill addition; design review comments focus on foothill compatibility.",
      },
    ],
    mapPoints: [
      { lat: 34.101, lng: -117.712, label: "Sycamore Elementary", kind: "school" },
      { lat: 34.09, lng: -117.715, label: "Claremont High School", kind: "school" },
      { lat: 34.0955, lng: -117.7205, label: "Claremont Village", kind: "amenity" },
      { lat: 34.103, lng: -117.727, label: "Memorial Park", kind: "amenity" },
      { lat: 34.0951, lng: -117.7197, label: "Metrolink Claremont", kind: "transit" },
    ],
  },
};

export const AREA_ORDER = ["highland-park", "eastvale", "fontana-southridge", "claremont"] as const;

export function getArea(id: string): Area | undefined {
  return AREAS[id];
}

export function listAreas(): Area[] {
  return AREA_ORDER.map((id) => AREAS[id]);
}

/** Simple autocomplete over pilot areas (Phase 2 replaces with Mapbox Search). */
export function searchAreas(query: string): Area[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return listAreas().filter((a) =>
    `${a.sampleAddress} ${a.name} ${a.county}`.toLowerCase().includes(q)
  );
}

export const DIRECTION_LABEL: Record<Area["direction"], string> = {
  improving: "Improving",
  "growing-rapidly": "Growing rapidly",
  stable: "Stable",
  declining: "Declining",
};

export const STATUS_LABEL: Record<Area["projects"][number]["status"], string> = {
  proposed: "Proposed",
  approved: "Approved",
  "under-construction": "Under construction",
  completed: "Completed",
};
