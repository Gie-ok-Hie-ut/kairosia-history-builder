import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import {
  getNotionItemById,
  trashNotionItem,
} from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export class TimelineItemNotFoundError extends Error {}

export async function deleteTimelineItem(id: string): Promise<void> {
  if (!isNotionConfigured()) {
    throw new Error("Notion 환경변수가 아직 설정되지 않았습니다.");
  }

  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") {
    throw new TimelineItemNotFoundError("삭제할 항목을 찾을 수 없습니다.");
  }

  const existing = await getNotionItemById(id, dataset.tracks);
  if (!existing) {
    throw new TimelineItemNotFoundError("삭제할 항목을 찾을 수 없습니다.");
  }

  await trashNotionItem(id);
  invalidateTimelineCache();
}
