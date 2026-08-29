import assert from "node:assert/strict";
import test from "node:test";
import { createFingerprint } from "../domain/import/fingerprint";
import {
  importPayloadSchema,
  registrationPayloadSchema,
} from "../domain/import/schema";
import {
  fromOrdinal,
  parseHistoricalYearInput,
  toOrdinal,
} from "../domain/timeline/historical-date";
import { assignLanes } from "../domain/timeline/lane-layout";
import { createGoogleMapsUrl } from "../domain/timeline/location";
import { createTimelineScale } from "../domain/timeline/time-scale";
import { timelineItemUpdateSchema } from "../domain/timeline/update-schema";
import { trackOrderUpdateSchema } from "../domain/timeline/track-order-schema";
import {
  createCenturyPhaseBands,
  createTimelineVisualItems,
  formatTimelineCursorLabel,
  getCenturyPhase,
  positionTimelineVisualItems,
} from "../domain/timeline/visual-layout";
import type {
  TimelineItem,
  TimelineVisualItem,
} from "../domain/timeline/types";
import { mapTimelinePage } from "../server/notion/mapper";
import {
  reorderNotionTracks,
  setNotionItemVisibility,
  trashNotionItem,
  updateNotionItemMetadata,
} from "../server/notion/repository";
import { requireAdminRequest } from "../server/auth/require-admin";
import type { NotionPage } from "../server/notion/types";

test("converts BCE and CE without a year zero", () => {
  assert.equal(toOrdinal({ year: 2, era: "BCE" }), -1);
  assert.equal(toOrdinal({ year: 1, era: "BCE" }), 0);
  assert.equal(toOrdinal({ year: 1, era: "CE" }), 1);
  assert.deepEqual(fromOrdinal(0), { year: 1, era: "BCE" });
  assert.deepEqual(fromOrdinal(1), { year: 1, era: "CE" });
  assert.throws(() => toOrdinal({ year: 0, era: "CE" }), RangeError);
  assert.deepEqual(parseHistoricalYearInput("기원전 44"), {
    year: 44,
    era: "BCE",
  });
});

test("assigns overlap lanes deterministically", () => {
  const items = [
    { id: "c", start: 10, end: 20 },
    { id: "a", start: 0, end: 15 },
    { id: "b", start: 4, end: 8 },
  ];

  assert.deepEqual(assignLanes(items), assignLanes([...items].reverse()));
  assert.deepEqual(assignLanes(items), [
    { id: "a", lane: 0 },
    { id: "b", lane: 1 },
    { id: "c", lane: 2 },
  ]);
});

test("keeps compressed timeline coordinates monotonic", () => {
  const visualItems = [visual("early", -80), visual("late", 260)];
  const scale = createTimelineScale({
    start: -100,
    end: 300,
    pixelsPerYear: 4,
    mode: "compressed",
    items: visualItems,
    gapThreshold: 20,
    compressedGapHeight: 18,
    anchorPaddingYears: 2,
  });

  let previous = -Infinity;
  for (let ordinal = -100; ordinal <= 300; ordinal += 1) {
    const current = scale.position(ordinal);
    assert.ok(current >= previous);
    previous = current;
  }
  assert.ok(scale.segments.some((segment) => segment.compressed));

  for (const ordinal of [-100, -80, 0, 100, 260, 300]) {
    assert.ok(Math.abs(scale.ordinalAt(scale.position(ordinal)) - ordinal) < 1e-8);
  }
});

test("compresses the interior of long duration items", () => {
  const longPeriod = {
    ...visual("patriarchs", -2165),
    endOrdinal: -1875,
  };
  const scale = createTimelineScale({
    start: -2200,
    end: -1840,
    pixelsPerYear: 4,
    mode: "compressed",
    items: [longPeriod],
    gapThreshold: 20,
    compressedGapHeight: 18,
    anchorPaddingYears: 2,
  });

  const absoluteDurationHeight =
    (longPeriod.endOrdinal - longPeriod.startOrdinal) * 4;
  const compressedDurationHeight =
    scale.position(longPeriod.endOrdinal) - scale.position(longPeriod.startOrdinal);

  assert.ok(
    scale.segments.some(
      (segment) =>
        segment.compressed &&
        segment.start > longPeriod.startOrdinal &&
        segment.end < longPeriod.endOrdinal,
    ),
  );
  assert.ok(compressedDurationHeight < absoluteDurationHeight / 5);
  assert.ok(
    Math.abs(scale.ordinalAt(scale.position(-2000)) - -2000) < 1e-8,
  );
});

test("labels each century as early, middle, and late", () => {
  const bands = createCenturyPhaseBands(-120, 2050, (ordinal) => ordinal, 0);
  const twentiethCentury = bands.filter(
    (band) => band.era === "CE" && band.century === 20,
  );

  assert.deepEqual(
    twentiethCentury.map((band) => band.label),
    ["20C 초반", "20C 중반", "20C 후반"],
  );
  assert.equal(twentiethCentury[0].startOrdinal, 1901);
  assert.equal(getCenturyPhase(1933).phase, "초반");
  assert.equal(getCenturyPhase(1934).phase, "중반");
  assert.equal(getCenturyPhase(1966).phase, "중반");
  assert.equal(getCenturyPhase(1967).phase, "후반");

  const firstCenturyBce = bands.filter(
    (band) => band.era === "BCE" && band.century === 1,
  );
  assert.deepEqual(
    firstCenturyBce.map((band) => band.label),
    ["BCE 1C 초반", "BCE 1C 중반", "BCE 1C 후반"],
  );
  assert.equal(firstCenturyBce[0].startOrdinal, -99);
  assert.equal(formatTimelineCursorLabel(1546), "1546, 16C 중반");
  assert.equal(formatTimelineCursorLabel(-1445), "BCE 1446, 15C 중반");
});

test("places broad periods behind the narrower events they contain", () => {
  const broad = timelineItem("broad", 1800, 1900);
  const narrow = timelineItem("narrow", 1800);
  const visuals = createTimelineVisualItems([narrow, broad], ["test"]);
  const positioned = positionTimelineVisualItems(
    visuals,
    ["test"],
    (ordinal) => ordinal,
    38,
  );
  const broadPosition = positioned.find((entry) => entry.visual.item.id === "broad");
  const narrowPosition = positioned.find((entry) => entry.visual.item.id === "narrow");

  assert.equal(broadPosition?.lane, 0);
  assert.equal(narrowPosition?.lane, 1);
  assert.ok((broadPosition?.height ?? 0) > (narrowPosition?.height ?? Infinity));
});

test("moves Notion pages to trash with the current API field", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.NOTION_API_KEY;
  let requestBody = "";
  process.env.NOTION_API_KEY = "test-api-key";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return Response.json({ object: "page", id: "page-id" });
  };

  try {
    await trashNotionItem("page-id");
    assert.deepEqual(JSON.parse(requestBody), { in_trash: true });
    assert.doesNotMatch(requestBody, /archived/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey == null) delete process.env.NOTION_API_KEY;
    else process.env.NOTION_API_KEY = originalApiKey;
  }
});

test("changes Notion visibility without exposing Draft as a timeline item", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.NOTION_API_KEY;
  let requestBody = "";
  process.env.NOTION_API_KEY = "test-api-key";
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "PATCH") {
      requestBody = String(init.body ?? "");
      return Response.json(editableNotionPage("Hidden"));
    }
    return Response.json(editableNotionPage("Published"));
  };

  try {
    const item = await setNotionItemVisibility(
      "notion-item",
      "hidden",
      [
        {
          id: "track-christian",
          key: "christian-history",
          name: "기독교사",
          parentKey: null,
          order: 1,
          color: "#b45309",
          visible: true,
        },
      ],
    );

    assert.equal(item?.visibility, "hidden");
    assert.deepEqual(JSON.parse(requestBody).properties.Status, {
      select: { name: "Hidden" },
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey == null) delete process.env.NOTION_API_KEY;
    else process.env.NOTION_API_KEY = originalApiKey;
  }
});

test("validates editable timeline metadata", () => {
  const input = editableMetadata();
  input.tags = [" 종교개혁 ", "종교개혁", "유럽사"];
  const parsed = timelineItemUpdateSchema.parse(input);
  assert.deepEqual(parsed.tags, ["종교개혁", "유럽사"]);

  assert.equal(
    timelineItemUpdateSchema.safeParse({ ...editableMetadata(), trackKeys: [] })
      .success,
    false,
  );
  assert.equal(
    timelineItemUpdateSchema.safeParse({
      ...editableMetadata(),
      confidence: "disputed",
      uncertaintyNote: null,
    }).success,
    false,
  );
});

test("requires a unique ordered list of Track keys", () => {
  assert.equal(
    trackOrderUpdateSchema.safeParse({
      trackKeys: ["korean-history", "world-history"],
    }).success,
    true,
  );
  assert.equal(
    trackOrderUpdateSchema.safeParse({
      trackKeys: ["korean-history", "korean-history"],
    }).success,
    false,
  );
  assert.equal(
    trackOrderUpdateSchema.safeParse({ trackKeys: [] }).success,
    false,
  );
});

test("persists the complete root Track order in Notion", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.NOTION_API_KEY;
  const originalTracksDataSourceId =
    process.env.NOTION_TRACKS_DATA_SOURCE_ID;
  const patches: Array<{ url: string; body: unknown }> = [];
  process.env.NOTION_API_KEY = "test-api-key";
  process.env.NOTION_TRACKS_DATA_SOURCE_ID = "tracks-source";

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/data_sources/tracks-source/query")) {
      return Response.json({
        results: [
          notionTrackPage("track-korean", "korean-history", "한국사", 1),
          notionTrackPage("track-world", "world-history", "세계사", 2),
        ],
        has_more: false,
        next_cursor: null,
      });
    }
    patches.push({
      url,
      body: JSON.parse(String(init?.body ?? "{}")),
    });
    return Response.json({ object: "page", id: "updated-track" });
  };

  try {
    const tracks = await reorderNotionTracks([
      "world-history",
      "korean-history",
    ]);

    assert.deepEqual(
      tracks.map((track) => [track.key, track.order]),
      [
        ["world-history", 1],
        ["korean-history", 2],
      ],
    );
    assert.deepEqual(
      patches.map((entry) => [
        entry.url.split("/").at(-1),
        (entry.body as { properties: { Order: { number: number } } }).properties
          .Order.number,
      ]),
      [
        ["track-world", 1],
        ["track-korean", 2],
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey == null) delete process.env.NOTION_API_KEY;
    else process.env.NOTION_API_KEY = originalApiKey;
    if (originalTracksDataSourceId == null) {
      delete process.env.NOTION_TRACKS_DATA_SOURCE_ID;
    } else {
      process.env.NOTION_TRACKS_DATA_SOURCE_ID = originalTracksDataSourceId;
    }
  }
});

test("updates editable metadata through Notion page properties", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.NOTION_API_KEY;
  let requestBody = "";
  process.env.NOTION_API_KEY = "test-api-key";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return Response.json(editableNotionPage());
  };

  try {
    const input = timelineItemUpdateSchema.parse(editableMetadata());
    const item = await updateNotionItemMetadata("notion-item", input, [
      {
        id: "track-christian",
        key: "christian-history",
        name: "기독교사",
        parentKey: null,
        order: 1,
        color: "#b45309",
        visible: true,
      },
    ]);
    const properties = JSON.parse(requestBody).properties;

    assert.equal(item.title, "수정된 사건");
    assert.deepEqual(properties.Tracks.relation, [{ id: "track-christian" }]);
    assert.deepEqual(properties.Tags.multi_select, [
      { name: "종교개혁" },
      { name: "유럽사" },
    ]);
    assert.equal(properties.Summary.rich_text[0].text.content, "수정된 요약");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey == null) delete process.env.NOTION_API_KEY;
    else process.env.NOTION_API_KEY = originalApiKey;
  }
});

test("allows loopback admin writes during local development", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnv.NODE_ENV;
  mutableEnv.NODE_ENV = "development";

  try {
    assert.equal(
      requireAdminRequest(new Request("http://[::1]:3000/api/admin/timeline/test")),
      null,
    );
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
  }
});

test("authorizes Cloudflare Access users listed as administrators", () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = mutableEnv.NODE_ENV;
  const previousAdminEmails = mutableEnv.ADMIN_EMAILS;
  mutableEnv.NODE_ENV = "production";
  mutableEnv.ADMIN_EMAILS = "owner@example.com, editor@example.com";

  try {
    const allowed = requireAdminRequest(
      new Request("https://kairosia.example/api/admin/timeline/test", {
        headers: {
          "cf-access-authenticated-user-email": "Owner@Example.com",
        },
      }),
    );
    const denied = requireAdminRequest(
      new Request("https://kairosia.example/api/admin/timeline/test", {
        headers: {
          "cf-access-authenticated-user-email": "visitor@example.com",
        },
      }),
    );

    assert.equal(allowed, null);
    assert.equal(denied?.status, 403);
  } finally {
    if (previousNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = previousNodeEnv;
    if (previousAdminEmails === undefined) delete mutableEnv.ADMIN_EMAILS;
    else mutableEnv.ADMIN_EMAILS = previousAdminEmails;
  }
});

test("rejects year zero and reversed import ranges", () => {
  const valid = importPayloadSchema.safeParse(payload());
  assert.equal(valid.success, true);

  const reversed = payload();
  reversed.items[0].time.end = {
    year: 1800,
    era: "CE",
    precision: "year",
  };
  const reversedResult = importPayloadSchema.safeParse(reversed);
  assert.equal(reversedResult.success, false);
  if (!reversedResult.success) {
    assert.ok(
      reversedResult.error.issues.some(
        (issue) => issue.path.join(".") === "items.0.time.end",
      ),
    );
  }

  const zero = payload();
  zero.items[0].time.start.year = 0;
  assert.equal(importPayloadSchema.safeParse(zero).success, false);

  const invalidLocation = payload();
  invalidLocation.items[0].location.latitude = 91;
  assert.equal(importPayloadSchema.safeParse(invalidLocation).success, false);
});

test("accepts exactly one item through the event registration contract", () => {
  assert.equal(registrationPayloadSchema.safeParse(payload()).success, true);

  const multiple = payload();
  multiple.items.push({ ...multiple.items[0], title: "Second item" });
  const result = registrationPayloadSchema.safeParse(multiple);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === "items" &&
          issue.message === "사건 등록은 한 번에 하나만 지원합니다.",
      ),
    );
  }
});

test("creates a keyless Google Maps URL from canonical coordinates", () => {
  const url = new URL(
    createGoogleMapsUrl({
      name: "Dartmouth College",
      latitude: 43.7044,
      longitude: -72.2887,
      precision: "approximate",
    }),
  );

  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "43.7044,-72.2887");
});

test("maps optional Notion location properties into the canonical model", () => {
  const page = {
    id: "notion-item",
    last_edited_time: "2026-08-29T00:00:00.000Z",
    object: "page",
    properties: {
      Title: titleProperty("로잔 세계복음화대회"),
      Type: selectProperty("event"),
      StartYear: { type: "number", number: 1974 },
      StartEra: selectProperty("CE"),
      StartPrecision: selectProperty("year"),
      TimeBasis: selectProperty("point"),
      Tracks: {
        type: "relation",
        relation: [{ id: "track-christian" }],
      },
      Tags: { type: "multi_select", multi_select: [{ name: "기독교사" }] },
      Importance: selectProperty("major"),
      Summary: textProperty("로잔언약이 채택된 국제 복음주의 대회"),
      RecordLevel: selectProperty("standard"),
      Confidence: selectProperty("high"),
      PlaceName: textProperty("스위스 로잔"),
      Latitude: { type: "number", number: 46.5197 },
      Longitude: { type: "number", number: 6.6323 },
      LocationPrecision: selectProperty("approximate"),
    },
  } satisfies NotionPage;

  const item = mapTimelinePage(
    page,
    new Map([["track-christian", "christian-history"]]),
  );

  assert.deepEqual(item.locations, [
    {
      name: "스위스 로잔",
      latitude: 46.5197,
      longitude: 6.6323,
      precision: "approximate",
    },
  ]);
});

test("creates stable fingerprints for canonical object keys", async () => {
  const left = await createFingerprint({ b: 2, a: { d: 4, c: 3 } });
  const right = await createFingerprint({ a: { c: 3, d: 4 }, b: 2 });
  assert.equal(left, right);
  assert.match(left, /^[a-f0-9]{64}$/);
});

function visual(id: string, ordinal: number): TimelineVisualItem {
  const item: TimelineItem = {
    id,
    slug: id,
    visibility: "published",
    title: id,
    type: "event",
    time: {
      start: { year: Math.max(1, Math.abs(ordinal)), era: "CE", precision: "year" },
      end: null,
      basis: "point",
    },
    trackKeys: ["test"],
    tags: [],
    importance: "core",
    summary: id,
    recordLevel: "simple",
    confidence: "high",
  };
  return {
    visualId: id + ":test",
    trackKey: "test",
    item,
    startOrdinal: ordinal,
    endOrdinal: ordinal,
  };
}

function timelineItem(id: string, start: number, end?: number): TimelineItem {
  return {
    id,
    slug: id,
    visibility: "published",
    title: id,
    type: "event",
    time: {
      start: { year: start, era: "CE", precision: "year" },
      end: end ? { year: end, era: "CE", precision: "year" } : null,
      basis: end ? "duration" : "point",
    },
    trackKeys: ["test"],
    tags: [],
    importance: "core",
    summary: id,
    recordLevel: "simple",
    confidence: "high",
  };
}

function payload() {
  return {
    schemaVersion: "1.0" as const,
    items: [
      {
        title: "Test item",
        type: "event" as const,
        time: {
          start: { year: 1900, era: "CE" as const, precision: "year" as const },
          end: null as null | {
            year: number;
            era: "BCE" | "CE";
            precision: "year";
          },
          basis: "point" as const,
        },
        trackKeys: ["world-history"],
        tags: [],
        importance: "core" as const,
        summary: "Test summary",
        detailMarkdown: "",
        recordLevel: "simple" as const,
        confidence: "high" as const,
        uncertaintyNote: null,
        location: {
          name: "Dartmouth College",
          latitude: 43.7044,
          longitude: -72.2887,
          precision: "approximate" as const,
        },
        sources: [],
      },
    ],
  };
}

function editableMetadata() {
  return {
    title: "수정된 사건",
    type: "event" as const,
    trackKeys: ["christian-history"],
    tags: ["종교개혁", "유럽사"],
    importance: "core" as const,
    summary: "수정된 요약",
    confidence: "high" as const,
    uncertaintyNote: null,
  };
}

function editableNotionPage(status = "Published"): NotionPage {
  return {
    id: "notion-item",
    last_edited_time: "2026-08-29T00:00:00.000Z",
    object: "page",
    properties: {
      Title: titleProperty("수정된 사건"),
      Type: selectProperty("event"),
      StartYear: { type: "number", number: 1517 },
      StartEra: selectProperty("CE"),
      StartPrecision: selectProperty("year"),
      TimeBasis: selectProperty("point"),
      Tracks: {
        type: "relation",
        relation: [{ id: "track-christian" }],
      },
      Tags: {
        type: "multi_select",
        multi_select: [{ name: "종교개혁" }, { name: "유럽사" }],
      },
      Importance: selectProperty("core"),
      Summary: textProperty("수정된 요약"),
      RecordLevel: selectProperty("standard"),
      Confidence: selectProperty("high"),
      UncertaintyNote: textProperty(""),
      Status: selectProperty(status),
    },
  };
}

function notionTrackPage(
  id: string,
  key: string,
  name: string,
  order: number,
): NotionPage {
  return {
    id,
    last_edited_time: "2026-08-29T00:00:00.000Z",
    object: "page",
    properties: {
      Name: titleProperty(name),
      Key: textProperty(key),
      Order: { type: "number", number: order },
      Color: selectProperty("blue"),
      Visible: { type: "checkbox", checkbox: true },
      Description: textProperty(""),
      Parent: { type: "relation", relation: [] },
    },
  };
}

function richText(value: string) {
  return [{ plain_text: value }];
}

function titleProperty(value: string) {
  return { type: "title", title: richText(value) };
}

function textProperty(value: string) {
  return { type: "rich_text", rich_text: richText(value) };
}

function selectProperty(value: string) {
  return { type: "select", select: { name: value } };
}
