import type { TimelineItem } from "@/domain/timeline/types";
import type { TimelineItemUpdate } from "@/domain/timeline/update-schema";
import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import {
  getNotionItemById,
  updateNotionItemMetadata,
} from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export class TimelineItemUpdateNotFoundError extends Error {}
export class TimelineItemUpdateValidationError extends Error {}

export async function updateTimelineItem(
  id: string,
  input: TimelineItemUpdate,
): Promise<TimelineItem> {
  if (!isNotionConfigured()) {
    throw new Error("Notion 환경변수가 아직 설정되지 않았습니다.");
  }

  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") {
    throw new TimelineItemUpdateNotFoundError("수정할 항목을 찾을 수 없습니다.");
  }

  const existing = await getNotionItemById(id, dataset.tracks);
  if (!existing) {
    throw new TimelineItemUpdateNotFoundError("수정할 항목을 찾을 수 없습니다.");
  }

  const knownTrackKeys = new Set(dataset.tracks.map((track) => track.key));
  const unknownTrackKey = input.trackKeys.find((key) => !knownTrackKeys.has(key));
  if (unknownTrackKey) {
    throw new TimelineItemUpdateValidationError(
      "알 수 없는 Track Key: " + unknownTrackKey,
    );
  }

  const updated = await updateNotionItemMetadata(id, input, dataset.tracks);
  invalidateTimelineCache();
  return updated;
}
