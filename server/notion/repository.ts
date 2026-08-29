import type { ImportItem } from "@/domain/import/schema";
import { getRangeOrdinals } from "@/domain/timeline/historical-date";
import type { TimelineItemUpdate } from "@/domain/timeline/update-schema";
import type {
  TimelineDataset,
  TimelineItem,
  TimelineTrack,
  TimelineVisibility,
} from "@/domain/timeline/types";
import {
  blocksToPlainText,
  blocksToSources,
  buildPageBlocks,
} from "./block-mapper";
import { NotionApiError, notionRequest } from "./client";
import {
  applyTrackParents,
  mapTimelinePage,
  mapTrackPage,
  readSelect,
  readRelations,
  richText,
} from "./mapper";
import type {
  NotionBlock,
  NotionBlockListResponse,
  NotionDataSource,
  NotionListResponse,
  NotionPage,
} from "./types";

export async function getNotionDataset(): Promise<TimelineDataset> {
  const itemsDataSourceId = requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID");
  const [tracks, itemsDataSource] = await Promise.all([
    listTracks(),
    notionRequest<NotionDataSource>("/data_sources/" + itemsDataSourceId),
  ]);
  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  const itemPages = await queryDataSource(itemsDataSourceId, {
    filter: {
      property: "Status",
      select: { equals: "Published" },
    },
    page_size: 100,
  });
  const items = itemPages.flatMap((page) => {
    try {
      const item = mapTimelinePage(page, trackKeyById);
      assertValidTimelineItem(item);
      return [item];
    } catch (error) {
      console.warn("Skipping invalid published Notion item.", {
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  });

  return {
    source: "notion",
    sourceUrl: notionUrl(
      itemsDataSource.parent.database_id ?? itemsDataSource.id,
    ),
    tracks,
    items,
  };
}

export async function getNotionHiddenItems(): Promise<TimelineItem[]> {
  const tracks = await listTracks();
  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  const pages = await queryDataSource(
    requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID"),
    {
      filter: {
        property: "Status",
        select: { equals: "Hidden" },
      },
      page_size: 100,
    },
  );

  return pages.flatMap((page) => {
    try {
      const item = mapTimelinePage(page, trackKeyById);
      assertValidTimelineItem(item);
      return [item];
    } catch (error) {
      console.warn("Skipping invalid hidden Notion item.", {
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  });
}

export interface NotionTrackInput {
  key: string;
  name: string;
  order: number;
  color: string;
  visible: boolean;
  description: string;
}

export class DuplicateNotionItemError extends Error {
  constructor() {
    super("동일한 JSON 항목이 이미 Notion에 등록되어 있습니다.");
    this.name = "DuplicateNotionItemError";
  }
}

export async function upsertNotionTrack(
  input: NotionTrackInput,
): Promise<TimelineTrack> {
  const existing = await queryDataSource(
    requiredEnv("NOTION_TRACKS_DATA_SOURCE_ID"),
    {
      filter: { property: "Key", rich_text: { equals: input.key } },
      page_size: 1,
    },
  );
  const properties = notionTrackProperties(input);
  const page = existing[0]
    ? await notionRequest<NotionPage>("/pages/" + existing[0].id, {
        method: "PATCH",
        body: JSON.stringify({ properties }),
      })
    : await notionRequest<NotionPage>("/pages", {
        method: "POST",
        body: JSON.stringify({
          parent: {
            type: "data_source_id",
            data_source_id: requiredEnv("NOTION_TRACKS_DATA_SOURCE_ID"),
          },
          properties,
        }),
      });
  return mapTrackPage(page);
}

export interface NotionTrackMigrationResult {
  track: TimelineTrack;
  relationsUpdated: number;
  sourceRemoved: boolean;
}

export async function migrateNotionTrack(
  sourceKey: string,
  target: NotionTrackInput,
): Promise<NotionTrackMigrationResult> {
  const tracks = await listTracks();
  const source = tracks.find((track) => track.key === sourceKey);
  const existingTarget = tracks.find((track) => track.key === target.key);

  if (!source || source.id === existingTarget?.id) {
    return {
      track: await upsertNotionTrack(target),
      relationsUpdated: 0,
      sourceRemoved: false,
    };
  }

  if (!existingTarget) {
    const page = await notionRequest<NotionPage>("/pages/" + source.id, {
      method: "PATCH",
      body: JSON.stringify({ properties: notionTrackProperties(target) }),
    });
    return {
      track: mapTrackPage(page),
      relationsUpdated: 0,
      sourceRemoved: false,
    };
  }

  const track = await upsertNotionTrack(target);
  const relationsUpdated = await replaceNotionTrackRelations(
    source.id,
    track.id,
  );
  await notionRequest<NotionPage>("/pages/" + source.id, {
    method: "PATCH",
    body: JSON.stringify({ in_trash: true }),
  });

  return {
    track,
    relationsUpdated,
    sourceRemoved: true,
  };
}

export async function trashNotionItem(id: string): Promise<void> {
  await notionRequest<NotionPage>("/pages/" + id, {
    method: "PATCH",
    body: JSON.stringify({ in_trash: true }),
  });
}

export async function getNotionItemById(
  id: string,
  tracks: TimelineTrack[],
): Promise<TimelineItem | null> {
  let page: NotionPage;
  try {
    page = await notionRequest<NotionPage>("/pages/" + id);
  } catch (error) {
    if (error instanceof NotionApiError && error.status === 404) return null;
    throw error;
  }

  const status = readSelect(page.properties.Status);
  if (page.in_trash || (status !== "Published" && status !== "Hidden")) {
    return null;
  }

  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  const item = mapTimelinePage(page, trackKeyById);
  assertValidTimelineItem(item);
  return item;
}

export async function setNotionItemVisibility(
  id: string,
  visibility: TimelineVisibility,
  tracks: TimelineTrack[],
): Promise<TimelineItem | null> {
  const existing = await getNotionItemById(id, tracks);
  if (!existing) return null;

  const page = await notionRequest<NotionPage>("/pages/" + id, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        Status: {
          select: { name: visibility === "hidden" ? "Hidden" : "Published" },
        },
      },
    }),
  });
  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  return mapTimelinePage(page, trackKeyById);
}

export async function updateNotionItemMetadata(
  id: string,
  input: TimelineItemUpdate,
  tracks: TimelineTrack[],
): Promise<TimelineItem> {
  const trackIdByKey = new Map(tracks.map((track) => [track.key, track.id]));
  const relationIds = input.trackKeys.map((key) => {
    const trackId = trackIdByKey.get(key);
    if (!trackId) throw new Error("알 수 없는 Track Key: " + key);
    return { id: trackId };
  });
  const page = await notionRequest<NotionPage>("/pages/" + id, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        Title: { title: richText(input.title) },
        Type: { select: { name: input.type } },
        Tracks: { relation: relationIds },
        Tags: { multi_select: input.tags.map((name) => ({ name })) },
        Importance: { select: { name: input.importance } },
        Summary: { rich_text: richText(input.summary) },
        Confidence: { select: { name: input.confidence } },
        UncertaintyNote: {
          rich_text: richText(input.uncertaintyNote ?? ""),
        },
      },
    }),
  });
  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  return mapTimelinePage(page, trackKeyById);
}

export async function attachNotionTrackToItems(
  trackKey: string,
  titles: string[],
): Promise<number> {
  const tracks = await listTracks();
  const track = tracks.find((entry) => entry.key === trackKey);
  if (!track) throw new Error("알 수 없는 Track Key: " + trackKey);

  let updated = 0;
  for (const title of titles) {
    const pages = await queryDataSource(
      requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID"),
      {
        filter: { property: "Title", title: { equals: title } },
        page_size: 10,
      },
    );
    for (const page of pages) {
      const relationIds = readRelations(page.properties.Tracks);
      if (relationIds.includes(track.id)) continue;
      await notionRequest<NotionPage>("/pages/" + page.id, {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Tracks: {
              relation: [...relationIds, track.id].map((id) => ({ id })),
            },
          },
        }),
      });
      updated += 1;
    }
  }
  return updated;
}

export async function getNotionItemDetail(
  id: string,
  dataset: TimelineDataset,
): Promise<TimelineItem | null> {
  const item = dataset.items.find((entry) => entry.id === id);
  if (!item) return null;

  const blocks = await listBlockChildren(id);
  return {
    ...item,
    detail: blocksToPlainText(blocks),
    sources: blocksToSources(blocks),
  };
}

export async function getNotionAdminItemDetail(
  id: string,
  tracks: TimelineTrack[],
): Promise<TimelineItem | null> {
  const item = await getNotionItemById(id, tracks);
  if (!item) return null;

  const blocks = await listBlockChildren(id);
  return {
    ...item,
    detail: blocksToPlainText(blocks),
    sources: blocksToSources(blocks),
  };
}

export async function commitNotionItem(
  input: ImportItem,
  fingerprint: string,
): Promise<TimelineItem> {
  const existing = await findPageByFingerprint(fingerprint);
  if (existing) {
    throw new DuplicateNotionItemError();
  }

  const tracks = await listTracks();
  const trackIdByKey = new Map(tracks.map((track) => [track.key, track.id]));
  const relationIds = input.trackKeys.map((key) => {
    const id = trackIdByKey.get(key);
    if (!id) throw new Error("알 수 없는 Track Key: " + key);
    return { id };
  });
  const slug =
    "item-" +
    input.time.start.era.toLowerCase() +
    "-" +
    input.time.start.year +
    "-" +
    fingerprint.slice(0, 8);

  const page = await notionRequest<NotionPage>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: {
        type: "data_source_id",
        data_source_id: requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID"),
      },
      properties: {
        Title: { title: richText(input.title) },
        Type: { select: { name: input.type } },
        StartYear: { number: input.time.start.year },
        StartEra: { select: { name: input.time.start.era } },
        StartMonth: { number: input.time.start.month ?? null },
        StartDay: { number: input.time.start.day ?? null },
        EndYear: { number: input.time.end?.year ?? null },
        EndEra: input.time.end
          ? { select: { name: input.time.end.era } }
          : { select: null },
        EndMonth: { number: input.time.end?.month ?? null },
        EndDay: { number: input.time.end?.day ?? null },
        StartPrecision: { select: { name: input.time.start.precision } },
        EndPrecision: input.time.end
          ? { select: { name: input.time.end.precision } }
          : { select: null },
        TimeBasis: { select: { name: input.time.basis } },
        Tracks: { relation: relationIds },
        Tags: { multi_select: input.tags.map((name) => ({ name })) },
        Importance: { select: { name: input.importance } },
        Summary: { rich_text: richText(input.summary) },
        RecordLevel: { select: { name: input.recordLevel } },
        Confidence: { select: { name: input.confidence } },
        UncertaintyNote: {
          rich_text: richText(input.uncertaintyNote ?? ""),
        },
        ...(input.location
          ? {
              PlaceName: { rich_text: richText(input.location.name) },
              Latitude: { number: input.location.latitude },
              Longitude: { number: input.location.longitude },
              LocationPrecision: {
                select: { name: input.location.precision },
              },
            }
          : {}),
        Status: { select: { name: "Draft" } },
        Slug: { rich_text: richText(slug) },
        ImportFingerprint: { rich_text: richText(fingerprint) },
      },
    }),
  });

  const blocks = buildPageBlocks(input.detailMarkdown, input.sources);
  if (blocks.length) {
    for (let index = 0; index < blocks.length; index += 100) {
      await notionRequest("/blocks/" + page.id + "/children", {
        method: "PATCH",
        body: JSON.stringify({
          children: blocks.slice(index, index + 100),
        }),
      });
    }
  }

  await notionRequest<NotionPage>("/pages/" + page.id, {
    method: "PATCH",
    body: JSON.stringify({
      properties: { Status: { select: { name: "Published" } } },
    }),
  });
  const canonical = await notionRequest<NotionPage>("/pages/" + page.id);

  const trackKeyById = new Map(tracks.map((track) => [track.id, track.key]));
  return {
    ...mapTimelinePage(canonical, trackKeyById),
    detail: input.detailMarkdown,
    sources: input.sources,
  };
}

async function listTracks(): Promise<TimelineTrack[]> {
  const pages = await queryDataSource(requiredEnv("NOTION_TRACKS_DATA_SOURCE_ID"), {
    page_size: 100,
    sorts: [{ property: "Order", direction: "ascending" }],
  });
  const valid = pages.flatMap((page) => {
    try {
      const track = mapTrackPage(page);
      if (!track.key || !track.name) {
        throw new Error("Track Name and Key are required.");
      }
      return [{ page, track }];
    } catch (error) {
      console.warn("Skipping invalid Notion Track.", {
        pageId: page.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  });
  return applyTrackParents(
    valid.map((entry) => entry.page),
    valid.map((entry) => entry.track),
  ).sort((a, b) => a.order - b.order);
}

async function replaceNotionTrackRelations(
  sourceTrackId: string,
  targetTrackId: string,
): Promise<number> {
  const pages = await queryDataSource(
    requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID"),
    {
      filter: {
        property: "Tracks",
        relation: { contains: sourceTrackId },
      },
      page_size: 100,
    },
  );

  for (const page of pages) {
    const relationIds = readRelations(page.properties.Tracks).map((id) =>
      id === sourceTrackId ? targetTrackId : id,
    );
    await notionRequest<NotionPage>("/pages/" + page.id, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          Tracks: {
            relation: [...new Set(relationIds)].map((id) => ({ id })),
          },
        },
      }),
    });
  }

  return pages.length;
}

function notionTrackProperties(input: NotionTrackInput) {
  return {
    Name: { title: richText(input.name) },
    Key: { rich_text: richText(input.key) },
    Order: { number: input.order },
    Color: { select: { name: input.color } },
    Visible: { checkbox: input.visible },
    Description: { rich_text: richText(input.description) },
  };
}

async function queryDataSource(
  dataSourceId: string,
  body: Record<string, unknown>,
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | null = null;

  do {
    const response: NotionListResponse = await notionRequest<NotionListResponse>(
      "/data_sources/" + dataSourceId + "/query",
      {
        method: "POST",
        body: JSON.stringify({
          ...body,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      },
    );
    pages.push(
      ...response.results.filter(
        (entry): entry is NotionPage => entry.object === "page",
      ),
    );
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return pages;
}

async function findPageByFingerprint(
  fingerprint: string,
): Promise<NotionPage | null> {
  const pages = await queryDataSource(requiredEnv("NOTION_ITEMS_DATA_SOURCE_ID"), {
    filter: {
      property: "ImportFingerprint",
      rich_text: { equals: fingerprint },
    },
    page_size: 1,
  });
  return pages[0] ?? null;
}

async function listBlockChildren(blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const response = await notionRequest<NotionBlockListResponse>(
      "/blocks/" + blockId + "/children?" + query,
    );
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return blocks;
}

function assertValidTimelineItem(item: TimelineItem) {
  if (!item.title.trim()) throw new Error("Title is required.");
  if (!item.summary.trim()) throw new Error("Summary is required.");
  if (!item.trackKeys.length) throw new Error("At least one Track is required.");

  const range = getRangeOrdinals(item.time);
  if (range.end < range.start) {
    throw new Error("End time cannot be earlier than start time.");
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("Missing environment variable: " + name);
  return value;
}

function notionUrl(id: string) {
  return `https://www.notion.so/${id.replaceAll("-", "")}`;
}
