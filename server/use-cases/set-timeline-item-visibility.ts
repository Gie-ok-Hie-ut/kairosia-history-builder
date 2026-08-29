import type {
  TimelineItem,
  TimelineVisibility,
} from "@/domain/timeline/types";
import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import { setNotionItemVisibility } from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export class TimelineItemVisibilityNotFoundError extends Error {}

export async function setTimelineItemVisibility(
  id: string,
  visibility: TimelineVisibility,
): Promise<TimelineItem> {
  if (!isNotionConfigured()) {
    throw new Error("Notion 환경변수가 아직 설정되지 않았습니다.");
  }

  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") {
    throw new TimelineItemVisibilityNotFoundError(
      "표시 상태를 바꿀 항목을 찾을 수 없습니다.",
    );
  }

  const item = await setNotionItemVisibility(id, visibility, dataset.tracks);
  if (!item) {
    throw new TimelineItemVisibilityNotFoundError(
      "표시 상태를 바꿀 항목을 찾을 수 없습니다.",
    );
  }

  invalidateTimelineCache();
  return item;
}
