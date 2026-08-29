import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { reorderNotionTracks } from "@/server/notion/repository";
import { getTimelineDataset } from "./get-timeline";

export class TimelineTrackOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineTrackOrderValidationError";
  }
}

export async function reorderTimelineTracks(trackKeys: string[]) {
  const dataset = await getTimelineDataset();
  if (dataset.source !== "notion") {
    throw new TimelineTrackOrderValidationError(
      "Notion이 연결된 환경에서만 순서를 저장할 수 있습니다.",
    );
  }

  const rootKeys = dataset.tracks
    .filter((track) => track.parentKey == null)
    .map((track) => track.key);
  if (
    trackKeys.length !== rootKeys.length ||
    rootKeys.some((key) => !trackKeys.includes(key))
  ) {
    throw new TimelineTrackOrderValidationError(
      "현재 최상위 Track 전체를 한 번씩 포함해야 합니다.",
    );
  }

  const tracks = await reorderNotionTracks(trackKeys);
  invalidateTimelineCache();
  return tracks.filter((track) => track.parentKey == null);
}
