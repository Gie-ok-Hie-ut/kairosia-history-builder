import type { ImportPayload } from "@/domain/import/schema";
import type { TimelineItem } from "@/domain/timeline/types";
import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { isNotionConfigured } from "@/server/notion/client";
import {
  commitNotionItem,
  DuplicateNotionItemError,
} from "@/server/notion/repository";
import { previewImport } from "./preview-import";

export interface CommitResult {
  results: Array<
    | { index: number; status: "published"; item: TimelineItem }
    | { index: number; status: "failed"; message: string }
    | { index: number; status: "duplicate"; message: string }
  >;
}

export async function commitImport(input: unknown): Promise<CommitResult> {
  if (!isNotionConfigured()) {
    throw new Error("Notion 환경변수가 아직 설정되지 않았습니다.");
  }

  const preview = await previewImport(input);
  if (!preview.ok) {
    throw new Error(preview.errors.map((error) => error.message).join(" "));
  }

  const payload: ImportPayload = preview.preview.payload;
  const results: CommitResult["results"] = [];

  for (const candidate of preview.preview.candidates) {
    if (candidate.duplicates.length) {
      results.push({
        index: candidate.index,
        status: "duplicate",
        message: "중복 후보가 있어 등록하지 않았습니다.",
      });
      continue;
    }

    try {
      const item = await commitNotionItem(
        payload.items[candidate.index],
        candidate.fingerprint,
      );
      results.push({ index: candidate.index, status: "published", item });
    } catch (error) {
      if (error instanceof DuplicateNotionItemError) {
        results.push({
          index: candidate.index,
          status: "duplicate",
          message: error.message,
        });
        continue;
      }
      results.push({
        index: candidate.index,
        status: "failed",
        message: error instanceof Error ? error.message : "등록에 실패했습니다.",
      });
    }
  }

  invalidateTimelineCache();
  return { results };
}
