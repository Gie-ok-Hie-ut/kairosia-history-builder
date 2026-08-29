export type Era = "BCE" | "CE";
export type Precision = "exact" | "year" | "decade" | "century" | "estimated";
export type TimelineItemType =
  | "event"
  | "person"
  | "book"
  | "idea"
  | "organization"
  | "technology";
export type TimeBasis =
  | "point"
  | "duration"
  | "lifespan"
  | "activity"
  | "publication"
  | "existence";
export type Importance = "core" | "major" | "detail";
export type RecordLevel = "simple" | "standard" | "rigorous";
export type Confidence = "high" | "medium" | "low" | "disputed";
export type LocationPrecision = "exact" | "approximate";
export type TimelineVisibility = "published" | "hidden";

export interface HistoricalInstant {
  year: number;
  era: Era;
  month?: number | null;
  day?: number | null;
  precision: Precision;
}

export interface HistoricalRange {
  start: HistoricalInstant;
  end: HistoricalInstant | null;
  basis: TimeBasis;
}

export interface TimelineSource {
  type: "primary" | "secondary" | "reference" | "web";
  title: string;
  author?: string | null;
  publishedYear?: number | null;
  url?: string | null;
  locator?: string | null;
  note?: string | null;
}

export interface TimelineLocation {
  name: string;
  latitude: number;
  longitude: number;
  precision: LocationPrecision;
}

export interface TimelineTrack {
  id: string;
  key: string;
  name: string;
  parentKey: string | null;
  order: number;
  color: string;
  visible: boolean;
  description?: string;
}

export interface TimelineItem {
  id: string;
  slug: string;
  visibility: TimelineVisibility;
  bookmarked: boolean;
  title: string;
  type: TimelineItemType;
  time: HistoricalRange;
  trackKeys: string[];
  tags: string[];
  importance: Importance;
  summary: string;
  detail?: string;
  recordLevel: RecordLevel;
  confidence: Confidence;
  uncertaintyNote?: string | null;
  locations?: TimelineLocation[];
  sources?: TimelineSource[];
  relatedItemIds?: string[];
}

export interface TimelineDataset {
  source: "demo" | "notion";
  sourceUrl?: string;
  tracks: TimelineTrack[];
  items: TimelineItem[];
}

export interface TimelineVisualItem {
  visualId: string;
  trackKey: string;
  item: TimelineItem;
  startOrdinal: number;
  endOrdinal: number;
}
