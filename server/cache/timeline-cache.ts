import type { TimelineDataset, TimelineItem } from "@/domain/timeline/types";

const CACHE_TTL_MS = 5 * 60 * 1_000;

let datasetCache:
  | { value: TimelineDataset; expiresAt: number }
  | undefined;
const detailCache = new Map<string, { value: TimelineItem; expiresAt: number }>();

export function readDatasetCache(): TimelineDataset | null {
  if (!datasetCache || datasetCache.expiresAt <= Date.now()) return null;
  return datasetCache.value;
}

export function readStaleDatasetCache(): TimelineDataset | null {
  return datasetCache?.value ?? null;
}

export function writeDatasetCache(value: TimelineDataset) {
  datasetCache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function readDetailCache(id: string): TimelineItem | null {
  const entry = detailCache.get(id);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.value;
}

export function writeDetailCache(value: TimelineItem) {
  detailCache.set(value.id, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateTimelineCache() {
  datasetCache = undefined;
  detailCache.clear();
}
