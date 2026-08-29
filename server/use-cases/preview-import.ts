import { createFingerprint } from "@/domain/import/fingerprint";
import { importItemToPreview } from "@/domain/import/normalize";
import {
  formatSchemaIssues,
  importPayloadSchema,
  type ImportPayload,
} from "@/domain/import/schema";
import { getRangeOrdinals, toOrdinal } from "@/domain/timeline/historical-date";
import type { TimelineItem } from "@/domain/timeline/types";
import { getTimelineDataset } from "./get-timeline";

export interface ImportPreview {
  payload: ImportPayload;
  candidates: Array<{
    index: number;
    fingerprint: string;
    item: TimelineItem;
    warnings: string[];
    duplicates: Array<{ id: string; title: string; reason: string }>;
  }>;
}

export async function previewImport(input: unknown): Promise<
  | { ok: true; preview: ImportPreview }
  | { ok: false; errors: Array<{ path: string; message: string }> }
> {
  const parsed = importPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: formatSchemaIssues(parsed.error) };
  }

  const dataset = await getTimelineDataset();
  const knownTracks = new Set(dataset.tracks.map((track) => track.key));
  const trackErrors = parsed.data.items.flatMap((item, itemIndex) =>
    item.trackKeys
      .filter((key) => !knownTracks.has(key))
      .map((key) => ({
        path: "items." + itemIndex + ".trackKeys",
        message: "존재하지 않는 Track Key입니다: " + key,
      })),
  );
  if (trackErrors.length) return { ok: false, errors: trackErrors };

  const candidates = await Promise.all(
    parsed.data.items.map(async (item, index) => {
      const fingerprint = await createFingerprint(item);
      const candidate = importItemToPreview(item, fingerprint, index);
      const warnings: string[] = [];
      if (item.recordLevel === "simple" && item.sources.length === 0) {
        warnings.push("간단 기록에 출처가 없습니다.");
      }
      return {
        index,
        fingerprint,
        item: candidate,
        warnings,
        duplicates: findDuplicateCandidates(candidate, dataset.items),
      };
    }),
  );

  return {
    ok: true,
    preview: { payload: parsed.data, candidates },
  };
}

function findDuplicateCandidates(
  candidate: TimelineItem,
  existing: TimelineItem[],
) {
  const candidateRange = getRangeOrdinals(candidate.time);
  const normalizedTitle = normalizeTitle(candidate.title);

  return existing
    .filter((item) => {
      const range = getRangeOrdinals(item.time);
      const sharesTrack = item.trackKeys.some((key) =>
        candidate.trackKeys.includes(key),
      );
      const sameTitle = normalizeTitle(item.title) === normalizedTitle;
      const closeDate =
        Math.abs(range.start - candidateRange.start) <= 2 ||
        Math.abs(toOrdinal(item.time.start) - toOrdinal(candidate.time.start)) <= 2;
      return sharesTrack && sameTitle && closeDate;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      reason: "같은 제목, 인접한 연도와 Track",
    }));
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[\s'"“”‘’『』《》〈〉]/g, "");
}
