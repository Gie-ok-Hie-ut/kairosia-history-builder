import type { TimelineItem } from "@/domain/timeline/types";
import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import { setNotionItemBookmark } from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export class TimelineItemBookmarkNotFoundError extends Error {}

export async function setTimelineItemBookmark(
  id: string,
  bookmarked: boolean,
): Promise<TimelineItem> {
  if (!isNotionConfigured()) {
    throw new Error("Notion 환경변수가 아직 설정되지 않았습니다.");
  }

  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") {
    throw new TimelineItemBookmarkNotFoundError(
      "북마크 상태를 바꿀 항목을 찾을 수 없습니다.",
    );
  }

  const item = await setNotionItemBookmark(id, bookmarked, dataset.tracks);
  if (!item) {
    throw new TimelineItemBookmarkNotFoundError(
      "북마크 상태를 바꿀 항목을 찾을 수 없습니다.",
    );
  }

  invalidateTimelineCache();
  return item;
}
