import { invalidateTimelineCache } from "../server/cache/timeline-cache";
import {
  attachNotionTrackToItems,
  upsertNotionTrack,
} from "../server/notion/repository";
import { commitImport } from "../server/use-cases/commit-import";
import { CORE_HISTORY_ITEMS, CORE_HISTORY_TRACKS } from "./core-history-data";

const BATCH_SIZE = 25;

for (const track of CORE_HISTORY_TRACKS) {
  await upsertNotionTrack(track);
  console.info(`Track ready: ${track.name} (${track.key})`);
}

invalidateTimelineCache();

const linked =
  (await attachNotionTrackToItems("american-history", ["미국 독립혁명"])) +
  (await attachNotionTrackToItems("israel-history", ["예루살렘 초기 교회 형성"]));
console.info(`Existing item relations updated: ${linked}`);
invalidateTimelineCache();

let published = 0;
let duplicate = 0;
let failed = 0;

for (let index = 0; index < CORE_HISTORY_ITEMS.length; index += BATCH_SIZE) {
  const items = CORE_HISTORY_ITEMS.slice(index, index + BATCH_SIZE);
  const result = await commitImport({ schemaVersion: "1.0", items });
  for (const entry of result.results) {
    if (entry.status === "published") published += 1;
    if (entry.status === "duplicate") duplicate += 1;
    if (entry.status === "failed") {
      failed += 1;
      console.error(`Item failed at batch index ${entry.index}: ${entry.message}`);
    }
  }
}

console.info(
  `Core history seed complete: ${published} published, ${duplicate} duplicate, ${failed} failed.`,
);

if (failed > 0) process.exitCode = 1;
