import type {
  TimelineItem,
  TimelineLocation,
  TimelineTrack,
} from "@/domain/timeline/types";
import type { NotionPage, NotionProperty, NotionRichText } from "./types";

export function mapTrackPage(page: NotionPage): TimelineTrack {
  const key = readText(page.properties.Key);
  return {
    id: page.id,
    key,
    name: readTitle(page.properties.Name),
    parentKey: null,
    order: readNumber(page.properties.Order) ?? 0,
    color: mapTrackColor(readSelect(page.properties.Color)),
    visible: readCheckbox(page.properties.Visible) ?? true,
    description: readText(page.properties.Description),
  };
}

export function applyTrackParents(
  pages: NotionPage[],
  tracks: TimelineTrack[],
): TimelineTrack[] {
  const keyById = new Map(tracks.map((track) => [track.id, track.key]));
  return tracks.map((track, index) => {
    const parentId = readRelations(pages[index]?.properties.Parent)[0];
    return {
      ...track,
      parentKey: parentId ? keyById.get(parentId) ?? null : null,
    };
  });
}

export function mapTimelinePage(
  page: NotionPage,
  trackKeyById: Map<string, string>,
): TimelineItem {
  const startYear = requiredNumber(page.properties.StartYear, "StartYear");
  const startEra = asEra(readSelect(page.properties.StartEra));
  const endYear = readNumber(page.properties.EndYear);
  const endEra = endYear ? asEra(readSelect(page.properties.EndEra)) : null;
  const location = mapLocation(page);

  return {
    id: page.id,
    slug: readText(page.properties.Slug) || page.id,
    visibility:
      readSelect(page.properties.Status) === "Hidden" ? "hidden" : "published",
    title: readTitle(page.properties.Title),
    type: asItemType(readSelect(page.properties.Type)),
    time: {
      start: {
        year: startYear,
        era: startEra,
        month: readNumber(page.properties.StartMonth),
        day: readNumber(page.properties.StartDay),
        precision: asPrecision(readSelect(page.properties.StartPrecision)),
      },
      end:
        endYear && endEra
          ? {
              year: endYear,
              era: endEra,
              month: readNumber(page.properties.EndMonth),
              day: readNumber(page.properties.EndDay),
              precision: asPrecision(
                readSelect(page.properties.EndPrecision) || "year",
              ),
            }
          : null,
      basis: asTimeBasis(readSelect(page.properties.TimeBasis)),
    },
    trackKeys: readRelations(page.properties.Tracks)
      .map((id) => trackKeyById.get(id))
      .filter((key): key is string => Boolean(key)),
    tags: readMultiSelect(page.properties.Tags),
    importance: asImportance(readSelect(page.properties.Importance)),
    summary: readText(page.properties.Summary),
    recordLevel: asRecordLevel(readSelect(page.properties.RecordLevel)),
    confidence: asConfidence(readSelect(page.properties.Confidence)),
    uncertaintyNote: readText(page.properties.UncertaintyNote) || null,
    locations: location ? [location] : [],
    relatedItemIds: readRelations(page.properties.RelatedItems),
  };
}

function mapLocation(page: NotionPage): TimelineLocation | null {
  const latitude = readNumber(page.properties.Latitude);
  const longitude = readNumber(page.properties.Longitude);
  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    name:
      readText(page.properties.PlaceName) ||
      `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude,
    longitude,
    precision:
      readSelect(page.properties.LocationPrecision) === "exact"
        ? "exact"
        : "approximate",
  };
}

export function richText(value: string) {
  return [{ type: "text", text: { content: value.slice(0, 2_000) } }];
}

export function readTitle(property?: NotionProperty): string {
  return plainText(property?.title);
}

export function readText(property?: NotionProperty): string {
  return plainText(property?.rich_text);
}

export function readNumber(property?: NotionProperty): number | null {
  return typeof property?.number === "number" ? property.number : null;
}

export function readSelect(property?: NotionProperty): string {
  return property?.select?.name ?? property?.status?.name ?? "";
}

export function readCheckbox(property?: NotionProperty): boolean | null {
  return typeof property?.checkbox === "boolean" ? property.checkbox : null;
}

export function readRelations(property?: NotionProperty): string[] {
  return property?.relation?.map((entry) => entry.id) ?? [];
}

export function readMultiSelect(property?: NotionProperty): string[] {
  return property?.multi_select?.map((entry) => entry.name) ?? [];
}

function plainText(value?: NotionRichText[]): string {
  return value?.map((entry) => entry.plain_text).join("") ?? "";
}

function requiredNumber(property: NotionProperty | undefined, name: string) {
  const value = readNumber(property);
  if (value == null) throw new Error("Missing Notion number property: " + name);
  return value;
}

function asEra(value: string): "BCE" | "CE" {
  return value === "BCE" ? "BCE" : "CE";
}

function asPrecision(value: string): TimelineItem["time"]["start"]["precision"] {
  return isOneOf(value, ["exact", "year", "decade", "century", "estimated"])
    ? value
    : "year";
}

function asItemType(value: string): TimelineItem["type"] {
  return isOneOf(value, ["event", "person", "book", "idea", "organization", "technology"])
    ? value
    : "event";
}

function asTimeBasis(value: string): TimelineItem["time"]["basis"] {
  return isOneOf(value, ["point", "duration", "lifespan", "activity", "publication", "existence"])
    ? value
    : "point";
}

function asImportance(value: string): TimelineItem["importance"] {
  return isOneOf(value, ["core", "major", "detail"]) ? value : "major";
}

function asRecordLevel(value: string): TimelineItem["recordLevel"] {
  return isOneOf(value, ["simple", "standard", "rigorous"]) ? value : "simple";
}

function asConfidence(value: string): TimelineItem["confidence"] {
  return isOneOf(value, ["high", "medium", "low", "disputed"]) ? value : "medium";
}

function isOneOf<const T extends readonly string[]>(
  value: string,
  options: T,
): value is T[number] {
  return options.includes(value);
}

function mapTrackColor(value: string) {
  const colors: Record<string, string> = {
    teal: "#0f766e",
    blue: "#2563eb",
    amber: "#b45309",
    red: "#b91c1c",
    violet: "#6d28d9",
    green: "#15803d",
    gray: "#4b5563",
  };
  return colors[value.toLowerCase()] ?? (value || "#4b5563");
}
