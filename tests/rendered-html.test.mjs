import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", String(Date.now()));
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost" + path, {
      headers: { accept: "text/html" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function render(path = "/") {
  return request(path);
}

test("server-renders the Kairosia: HistoryBuilder workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Kairosia: HistoryBuilder<\/title>/i);
  assert.match(html, /내가 만들어가는 역사 지도/);
  assert.match(html, /사건 등록/);
  assert.doesNotMatch(html, /JSON 등록/);
  assert.match(html, /한국사/);
  assert.match(html, /다트머스 회의/);
  assert.match(html, /미국 뉴햄프셔주 하노버/);
  assert.match(html, /https:\/\/www\.google\.com\/maps\/search/);
  assert.match(
    html,
    /property="og:image" content="http:\/\/localhost(?::\d+)?\/og-kairosia\.png"/,
  );
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("accepts Notion's webhook verification handshake", async () => {
  const response = await request("/api/notion/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ verification_token: "test-token" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true });
});

test("paginates timeline list responses", async () => {
  const response = await request("/api/timeline?limit=2&importance=core");
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.items.length, 2);
  assert.equal(result.pageInfo.nextCursor, "2");
  assert.ok(result.pageInfo.total > result.items.length);
});

test("rejects invalid timeline edit payloads", async () => {
  process.env.ADMIN_EMAILS = "admin@example.com";
  try {
    const response = await request("/api/admin/timeline/notion-item", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "oai-authenticated-user-email": "admin@example.com",
      },
      body: JSON.stringify({ tags: ["부분 입력"] }),
    });
    const result = await response.json();

    assert.equal(response.status, 400);
    assert.equal(result.ok, false);
    assert.ok(result.issues.length > 0);
  } finally {
    delete process.env.ADMIN_EMAILS;
  }
});

test("verifies signed Notion webhook events", async () => {
  const token = "integration-test-token";
  const rawBody = JSON.stringify({ type: "page.properties_updated" });
  const signature =
    "sha256=" + createHmac("sha256", token).update(rawBody).digest("hex");
  process.env.NOTION_WEBHOOK_TOKEN = token;

  try {
    const response = await request("/api/notion/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-notion-signature": signature,
      },
      body: rawBody,
    });
    assert.equal(response.status, 200);

    const rejected = await request("/api/notion/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-notion-signature": "sha256=invalid",
      },
      body: rawBody,
    });
    assert.equal(rejected.status, 401);
  } finally {
    delete process.env.NOTION_WEBHOOK_TOKEN;
  }
});

test("keeps domain and Notion concerns outside the page component", async () => {
  const [
    page,
    workspace,
    trackFilters,
    board,
    importPanel,
    directImportForm,
    mapper,
    repository,
    hiddenRoute,
    trackOrderRoute,
    packageJson,
    readme,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/HistoryWorkspace.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/toolbar/TrackFilters.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../components/timeline/TimelineBoard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/import/ImportPanel.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../components/import/DirectImportForm.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../server/notion/mapper.ts", import.meta.url), "utf8"),
    readFile(new URL("../server/notion/repository.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/admin/timeline/hidden/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/admin/tracks/order/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /getTimelineDataset/);
  assert.doesNotMatch(page, /Notion|toOrdinal|assignLanes/);
  assert.match(workspace, /TimelineBoard/);
  assert.doesNotMatch(workspace, /NOTION_API_KEY|data_sources/);
  assert.match(board, /visiblePositioned/);
  assert.match(importPanel, /DirectImportForm/);
  assert.match(importPanel, /직접 입력/);
  assert.match(importPanel, /Notion에 등록/);
  assert.match(importPanel, /direct-editor-wrap[\s\S]*json-editor-wrap/);
  assert.match(importPanel, /json-editor-header/);
  assert.match(importPanel, /현재 JSON 복사/);
  assert.match(importPanel, /item=\{payload\.items\[0\]\}/);
  assert.match(importPanel, /registrationPayloadSchema/);
  assert.match(importPanel, /setJsonText\(serializePayload\(nextPayload\)\)/);
  assert.match(importPanel, /setPayload\(parsed\)/);
  assert.doesNotMatch(
    importPanel,
    /미리보기|ImportMode|setMode|addItem|removeSelectedItem/,
  );
  assert.match(directImportForm, /역사 Track/);
  assert.match(directImportForm, /출처/);
  assert.match(mapper, /mapTimelinePage/);
  assert.match(repository, /select: \{ equals: "Published" \}/);
  assert.match(repository, /select: \{ equals: "Hidden" \}/);
  assert.match(hiddenRoute, /requireAdminRequest/);
  assert.match(trackOrderRoute, /requireAdminRequest/);
  assert.match(trackOrderRoute, /reorderTimelineTracks/);
  assert.match(workspace, /hidden-toggle/);
  assert.match(workspace, /visibleTimelineItems/);
  assert.match(workspace, /TrackFilters/);
  assert.match(trackFilters, /DndContext/);
  assert.match(trackFilters, /SortableContext/);
  assert.match(trackFilters, /\/api\/admin\/tracks\/order/);
  assert.match(repository, /Failed to roll back a Notion Track order/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(readme, /vinext-starter|loading skeleton/i);

  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
  await access(new URL("BRAIDED_HISTORY_PLAN.md", projectRoot));
});
