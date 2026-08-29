import type { TimelineDataset, TimelineItem } from "@/domain/timeline/types";
import { DEMO_DATASET } from "@/server/demo-data";
import {
  readDatasetCache,
  readDetailCache,
  readStaleDatasetCache,
  writeDatasetCache,
  writeDetailCache,
} from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import {
  getNotionDataset,
  getNotionItemDetail,
} from "@/server/notion/repository";

export async function getTimelineDataset(): Promise<TimelineDataset> {
  if (!isNotionConfigured()) return DEMO_DATASET;

  const cached = readDatasetCache();
  if (cached) return cached;

  try {
    const dataset = await getNotionDataset();
    writeDatasetCache(dataset);
    return dataset;
  } catch (error) {
    const stale = readStaleDatasetCache();
    if (!stale) throw error;
    console.warn("Notion read failed; serving the last normalized dataset.", error);
    return stale;
  }
}

export async function getTimelineItemDetail(
  id: string,
): Promise<TimelineItem | null> {
  const cached = readDetailCache(id);
  if (cached) return cached;

  const dataset = await getTimelineDataset();
  if (dataset.source === "demo") {
    return dataset.items.find((item) => item.id === id) ?? null;
  }

  const item = await getNotionItemDetail(id, dataset);
  if (item) writeDetailCache(item);
  return item;
}
