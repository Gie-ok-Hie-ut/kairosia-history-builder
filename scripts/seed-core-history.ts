import { invalidateTimelineCache } from "../server/cache/timeline-cache";
import {
  attachNotionTrackToItems,
  migrateNotionTrack,
  upsertNotionTrack,
} from "../server/notion/repository";
import { commitImport } from "../server/use-cases/commit-import";
import { CORE_HISTORY_ITEMS, CORE_HISTORY_TRACKS } from "./core-history-data";
import {
  EAST_ASIAN_RELATED_TITLES,
  EUROPEAN_RELATED_TITLES,
  HISTORY_EXPANSION_ITEMS,
} from "./history-expansion-data";

const BATCH_SIZE = 25;
const allItems = [...CORE_HISTORY_ITEMS, ...HISTORY_EXPANSION_ITEMS];

const eastAsianTrack = requiredTrack("east-asian-history");
const christianTrack = requiredTrack("christian-history");

const eastAsianMigration = await migrateNotionTrack(
  "japanese-history",
  eastAsianTrack,
);
console.info(
  `Track migrated: 일본사 -> ${eastAsianMigration.track.name} ` +
    `(relations ${eastAsianMigration.relationsUpdated})`,
);

const christianMigration = await migrateNotionTrack(
  "israel-history",
  christianTrack,
);
console.info(
  `Track merged: 이스라엘사 -> ${christianMigration.track.name} ` +
    `(relations ${christianMigration.relationsUpdated})`,
);

for (const track of CORE_HISTORY_TRACKS) {
  await upsertNotionTrack(track);
  console.info(`Track ready: ${track.name} (${track.key})`);
}

invalidateTimelineCache();

let published = 0;
let duplicate = 0;
let failed = 0;

for (let index = 0; index < allItems.length; index += BATCH_SIZE) {
  const items = allItems.slice(index, index + BATCH_SIZE);
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

const linked =
  (await attachNotionTrackToItems("american-history", ["미국 독립혁명"])) +
  (await attachNotionTrackToItems(
    "east-asian-history",
    [...EAST_ASIAN_RELATED_TITLES],
  )) +
  (await attachNotionTrackToItems(
    "european-history",
    [...EUROPEAN_RELATED_TITLES],
  ));
console.info(`Existing item relations updated: ${linked}`);
invalidateTimelineCache();

console.info(
  `Core history seed complete: ${published} published, ${duplicate} duplicate, ${failed} failed.`,
);

if (failed > 0) process.exitCode = 1;

function requiredTrack(key: string) {
  const track = CORE_HISTORY_TRACKS.find((entry) => entry.key === key);
  if (!track) throw new Error("Missing core Track: " + key);
  return track;
}
