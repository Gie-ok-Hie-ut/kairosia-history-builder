import type { TimelineItem } from "@/domain/timeline/types";
import { isNotionConfigured } from "@/server/notion/client";
import {
  getNotionAdminItemDetail,
  getNotionHiddenItems,
} from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export async function getHiddenTimelineItems(): Promise<TimelineItem[]> {
  if (!isNotionConfigured()) return [];
  return getNotionHiddenItems();
}

export async function getAdminTimelineItemDetail(
  id: string,
): Promise<TimelineItem | null> {
  if (!isNotionConfigured()) return null;

  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") return null;
  return getNotionAdminItemDetail(id, dataset.tracks);
}
