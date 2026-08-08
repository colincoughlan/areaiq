/** Domain types for AreaIQ. Every fact-bearing type carries sourcing metadata. */

export type Confidence = "high" | "medium" | "limited";

export type SourceKind =
  | "official-record"
  | "government-dataset"
  | "licensed-data"
  | "local-news"
  | "ai-interpretation"
  | "sample-data";

export interface Sourced<T> {
  value: T;
  source: SourceKind;
  /** Human-readable source name, e.g. "U.S. Census ACS 5-year" */
  sourceName: string;
  retrievedAt: string; // ISO date
  confidence: Confidence;
}

export type ProjectStatus = "proposed" | "approved" | "under-construction" | "completed";

export interface DevelopmentProject {
  name: string;
  type: string;
  status: ProjectStatus;
  size: string;
  dates: string;
  agency: string;
  lat: number;
  lng: number;
  /** Labeled AI interpretation — never presented as fact. */
  possibleEffects: string;
}

export interface SchoolInfo {
  name: string;
  district: string;
  note: string;
}

export interface HousingMetrics {
  ownerOccupied: Sourced<string>;
  renterOccupied: Sourced<string>;
  vacancy: Sourced<string>;
  medianPrice: Sourced<string>;
  housingAge: Sourced<string>;
  permits24mo: Sourced<string>;
}

export interface ComponentScores {
  dailyLife: number;
  housing: number;
  futureScore: number;
  confidence: Confidence;
}

export type Direction = "improving" | "growing-rapidly" | "stable" | "declining";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  kind: "school" | "amenity" | "project" | "transit";
}

export interface Area {
  id: string;
  name: string;
  county: string;
  sampleAddress: string;
  lat: number;
  lng: number;
  zoom: number;
  direction: Direction;
  directionDetail: string;
  /** Fire/flood/air headline — surfaced on the summary card by product rule. */
  riskHeadline: string;
  scores: ComponentScores;
  strengths: string[];
  tradeoffs: string[];
  narrative: string;
  changing: string;
  housing: HousingMetrics;
  schools: SchoolInfo[];
  amenitiesSummary: string;
  amenityDetail: [string, string][];
  mobility: string;
  environment: string;
  projects: DevelopmentProject[];
  mapPoints: MapPoint[];
}
