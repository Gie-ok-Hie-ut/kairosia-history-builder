import type { ImportItem } from "./schema";
import type { TimelineItem } from "../timeline/types";

export function importItemToPreview(
  item: ImportItem,
  fingerprint: string,
  index: number,
): TimelineItem {
  const startLabel = item.time.start.era.toLowerCase() + "-" + item.time.start.year;

  return {
    id: "preview-" + index + "-" + fingerprint.slice(0, 8),
    slug: "item-" + startLabel + "-" + fingerprint.slice(0, 8),
    visibility: "published",
    bookmarked: false,
    title: item.title,
    type: item.type,
    time: item.time,
    trackKeys: item.trackKeys,
    tags: item.tags,
    importance: item.importance,
    summary: item.summary,
    detail: item.detailMarkdown,
    recordLevel: item.recordLevel,
    confidence: item.confidence,
    uncertaintyNote: item.uncertaintyNote,
    locations: item.location ? [item.location] : [],
    sources: item.sources,
  };
}
