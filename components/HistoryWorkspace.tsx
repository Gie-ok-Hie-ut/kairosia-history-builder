"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  LoaderCircle,
  LocateFixed,
  Plus,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { parseHistoricalYearInput, toOrdinal } from "@/domain/timeline/historical-date";
import type { TimelineMode } from "@/domain/timeline/time-scale";
import type { TimelineItemUpdate } from "@/domain/timeline/update-schema";
import type {
  TimelineDataset,
  TimelineItem,
  TimelineTrack,
  TimelineVisibility,
} from "@/domain/timeline/types";
import { ImportPanel } from "@/components/import/ImportPanel";
import { DetailPanel } from "@/components/timeline/DetailPanel";
import { TimelineBoard } from "@/components/timeline/TimelineBoard";
import { TrackFilters } from "@/components/toolbar/TrackFilters";

interface HistoryWorkspaceProps {
  dataset: TimelineDataset;
}

const ZOOM_LEVELS = [2.2, 3.4, 5.2];
const VIEW_STORAGE_KEY = "braided-history:view";
const VIEW_STORAGE_VERSION = 2;

export function HistoryWorkspace({ dataset }: HistoryWorkspaceProps) {
  const initialRootTracks = useMemo(
    () =>
      dataset.tracks
        .filter((track) => track.parentKey == null)
        .sort((a, b) => a.order - b.order),
    [dataset.tracks],
  );
  const [rootTracks, setRootTracks] = useState(initialRootTracks);
  const [timelineItems, setTimelineItems] = useState(dataset.items);
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [hiddenError, setHiddenError] = useState("");
  const [activeTrackKeys, setActiveTrackKeys] = useState<string[]>(
    initialRootTracks.filter((track) => track.visible).map((track) => track.key),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<TimelineMode>("compressed");
  const [zoomIndex, setZoomIndex] = useState(1);
  const [yearInput, setYearInput] = useState("1950");
  const [jumpTarget, setJumpTarget] = useState<{
    ordinal: number;
    nonce: number;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(
    dataset.items.find((item) => item.id === "dartmouth-1956") ??
      dataset.items[0] ??
      null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [viewRestored, setViewRestored] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (!saved) {
        setViewRestored(true);
        return;
      }
      try {
        const value = JSON.parse(saved) as {
          activeTrackKeys?: string[];
          mode?: TimelineMode;
          zoomIndex?: number;
          version?: number;
        };
        if (value.activeTrackKeys?.length) {
          const known = new Set(initialRootTracks.map((track) => track.key));
          const valid = value.activeTrackKeys.filter((key) => known.has(key));
          if (valid.length) setActiveTrackKeys(valid);
        }
        if (
          value.version === VIEW_STORAGE_VERSION &&
          (value.mode === "absolute" || value.mode === "compressed")
        ) {
          setMode(value.mode);
        }
        if (
          typeof value.zoomIndex === "number" &&
          value.zoomIndex >= 0 &&
          value.zoomIndex < ZOOM_LEVELS.length
        ) {
          setZoomIndex(value.zoomIndex);
        }
      } catch {
        window.localStorage.removeItem(VIEW_STORAGE_KEY);
      } finally {
        setViewRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [initialRootTracks]);

  useEffect(() => {
    if (!viewRestored) return;
    window.localStorage.setItem(
      VIEW_STORAGE_KEY,
      JSON.stringify({
        activeTrackKeys,
        mode,
        version: VIEW_STORAGE_VERSION,
        zoomIndex,
      }),
    );
  }, [activeTrackKeys, mode, viewRestored, zoomIndex]);

  const activeTracks = rootTracks.filter((track) =>
    activeTrackKeys.includes(track.key),
  );
  const registrationTracks = [
    ...rootTracks,
    ...dataset.tracks
      .filter((track) => track.parentKey != null)
      .sort((a, b) => a.order - b.order),
  ];
  const visibleTimelineItems = timelineItems.filter(
    (item) => item.visibility === "published" || showHidden,
  );
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = visibleTimelineItems.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.summary.toLowerCase().includes(normalizedQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
    );
  });

  function toggleTrack(track: TimelineTrack) {
    setActiveTrackKeys((current) => {
      if (current.includes(track.key)) {
        if (current.length === 1) return current;
        return current.filter((key) => key !== track.key);
      }
      return [...current, track.key];
    });
  }

  function jumpToYear() {
    const parsed = parseHistoricalYearInput(yearInput);
    if (!parsed) return;
    setJumpTarget({ ordinal: toOrdinal(parsed), nonce: Date.now() });
  }

  async function selectItem(item: TimelineItem) {
    setSelectedItem(item);
    if (item.detail || dataset.source === "demo") return;

    const endpoint =
      item.visibility === "hidden"
        ? "/api/admin/timeline/"
        : "/api/timeline/";
    const response = await fetch(endpoint + encodeURIComponent(item.id));
    if (!response.ok) return;
    const result = (await response.json()) as { item?: TimelineItem };
    if (result.item) setSelectedItem(result.item);
  }

  async function toggleHiddenItems() {
    if (showHidden) {
      setShowHidden(false);
      setSelectedItem((current) =>
        current?.visibility === "hidden"
          ? timelineItems.find((item) => item.visibility === "published") ?? null
          : current,
      );
      return;
    }

    setHiddenLoading(true);
    setHiddenError("");
    try {
      const response = await fetch("/api/admin/timeline/hidden");
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; items?: TimelineItem[]; message?: string }
        | null;
      if (!response.ok || !result?.ok || !result.items) {
        throw new Error(result?.message ?? "숨긴 사건을 불러오지 못했습니다.");
      }
      setTimelineItems((current) =>
        mergeTimelineItems(
          current.filter((item) => item.visibility === "published"),
          result.items ?? [],
        ),
      );
      setShowHidden(true);
    } catch (error) {
      setHiddenError(
        error instanceof Error ? error.message : "숨긴 사건을 불러오지 못했습니다.",
      );
    } finally {
      setHiddenLoading(false);
    }
  }

  function applyImportedItems(importedItems: TimelineItem[]) {
    if (!importedItems.length) return;
    setTimelineItems((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      for (const item of importedItems) byId.set(item.id, item);
      return Array.from(byId.values());
    });
    setSelectedItem(importedItems[0]);
  }

  async function deleteItem(itemId: string) {
    const response = await fetch(
      "/api/admin/timeline/" + encodeURIComponent(itemId),
      { method: "DELETE" },
    );
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; message?: string }
      | null;
    if (!response.ok || !result?.ok) {
      throw new Error(result?.message ?? "삭제에 실패했습니다.");
    }

    setTimelineItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedItem((current) =>
      current?.id === itemId
        ? timelineItems.find(
            (item) =>
              item.id !== itemId &&
              (showHidden || item.visibility === "published"),
          ) ?? null
        : current,
    );
  }

  async function changeItemVisibility(
    itemId: string,
    visibility: TimelineVisibility,
  ): Promise<TimelineItem> {
    const response = await fetch(
      "/api/admin/timeline/" +
        encodeURIComponent(itemId) +
        "/visibility",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; item?: TimelineItem; message?: string }
      | null;
    if (!response.ok || !result?.ok || !result.item) {
      throw new Error(result?.message ?? "표시 상태 변경에 실패했습니다.");
    }

    const existing =
      selectedItem?.id === itemId
        ? selectedItem
        : timelineItems.find((item) => item.id === itemId);
    const updated = mergeTimelineItem(existing, result.item);
    setTimelineItems((current) =>
      mergeTimelineItems(current, [result.item as TimelineItem]),
    );
    setSelectedItem((current) => {
      if (current?.id !== itemId) return current;
      if (visibility === "hidden" && !showHidden) {
        return (
          timelineItems.find(
            (item) =>
              item.id !== itemId && item.visibility === "published",
          ) ?? null
        );
      }
      return updated;
    });
    return updated;
  }

  async function updateItem(
    itemId: string,
    input: TimelineItemUpdate,
  ): Promise<TimelineItem> {
    const response = await fetch(
      "/api/admin/timeline/" + encodeURIComponent(itemId),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; item?: TimelineItem; message?: string }
      | null;
    if (!response.ok || !result?.ok || !result.item) {
      throw new Error(result?.message ?? "수정에 실패했습니다.");
    }

    const existing =
      selectedItem?.id === itemId
        ? selectedItem
        : timelineItems.find((item) => item.id === itemId);
    const updated: TimelineItem = {
      ...(existing ?? result.item),
      ...result.item,
      detail: existing?.detail,
      sources: existing?.sources,
    };
    setTimelineItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...result.item } : item,
      ),
    );
    setSelectedItem(updated);
    return updated;
  }

  return (
    <main className="history-shell">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark">K:H</span>
          <div>
            <h1>Kairosia: HistoryBuilder</h1>
            <span>내가 만들어가는 역사 지도</span>
          </div>
        </div>

        <div className="header-actions">
          {dataset.source === "notion" && dataset.sourceUrl ? (
            <a
              className="data-source data-source-notion"
              href={dataset.sourceUrl}
              rel="noreferrer"
              target="_blank"
              title="연결된 Notion 데이터베이스 열기"
            >
              <Database aria-hidden="true" size={13} />
              Notion
              <ExternalLink aria-hidden="true" size={11} />
            </a>
          ) : (
            <span className="data-source data-source-demo">
              <Database aria-hidden="true" size={13} />
              샘플 데이터
            </span>
          )}
          <button
            className="command-button"
            onClick={() => setImportOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={16} />
            사건 등록
          </button>
        </div>
      </header>

      <div className="workspace-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" size={16} />
          <input
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="사건, 인물, 저작 검색"
            type="search"
            value={searchQuery}
          />
          {searchQuery ? <kbd>{filteredItems.length}</kbd> : null}
        </label>

        <div className="mode-control" aria-label="시간 모드">
          <button
            className={mode === "absolute" ? "is-active" : ""}
            onClick={() => setMode("absolute")}
            type="button"
          >
            절대 시간
          </button>
          <button
            className={mode === "compressed" ? "is-active" : ""}
            onClick={() => setMode("compressed")}
            type="button"
          >
            공백 압축
          </button>
        </div>

        <div className="year-jump">
          <CalendarRange aria-hidden="true" size={15} />
          <input
            aria-label="이동할 연도"
            onChange={(event) => setYearInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") jumpToYear();
            }}
            value={yearInput}
          />
          <button
            aria-label="연도로 이동"
            onClick={jumpToYear}
            title="연도로 이동"
            type="button"
          >
            <LocateFixed size={16} />
          </button>
        </div>

        <div className="toolbar-track-filters" aria-label="표시할 역사 분야">
          {dataset.source === "notion" ? (
            <button
              aria-label={showHidden ? "숨긴 사건 감추기" : "숨긴 사건 보기"}
              aria-pressed={showHidden}
              className={
                "hidden-toggle" +
                (showHidden ? " is-active" : "") +
                (hiddenError ? " has-error" : "")
              }
              disabled={hiddenLoading}
              onClick={toggleHiddenItems}
              title={
                hiddenError ||
                (showHidden ? "숨긴 사건 감추기" : "숨긴 사건 모두 보기")
              }
              type="button"
            >
              {hiddenLoading ? (
                <LoaderCircle className="spin" size={15} />
              ) : showHidden ? (
                <Eye size={15} />
              ) : (
                <EyeOff size={15} />
              )}
            </button>
          ) : null}
          <TrackFilters
            activeTrackKeys={activeTrackKeys}
            onOrderChange={setRootTracks}
            onToggle={toggleTrack}
            reorderEnabled={dataset.source === "notion"}
            tracks={rootTracks}
          />
        </div>

        <div className="zoom-control">
          <button
            aria-label="축소"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
            title="축소"
            type="button"
          >
            <ZoomOut size={16} />
          </button>
          <span>{zoomIndex + 1}/3</span>
          <button
            aria-label="확대"
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            onClick={() =>
              setZoomIndex((index) =>
                Math.min(ZOOM_LEVELS.length - 1, index + 1),
              )
            }
            title="확대"
            type="button"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        <section className="timeline-workspace" aria-label="역사 연대표">
          <TimelineBoard
            items={filteredItems}
            jumpTarget={jumpTarget}
            mode={mode}
            onSelectItem={selectItem}
            pixelsPerYear={ZOOM_LEVELS[zoomIndex]}
            scaleItems={visibleTimelineItems}
            selectedItemId={selectedItem?.id ?? null}
            tracks={activeTracks}
          />
        </section>

        <DetailPanel
          item={selectedItem}
          key={selectedItem?.id ?? "empty"}
          onDelete={dataset.source === "notion" ? deleteItem : undefined}
          onVisibilityChange={
            dataset.source === "notion" ? changeItemVisibility : undefined
          }
          onUpdate={dataset.source === "notion" ? updateItem : undefined}
          tracks={rootTracks}
        />
      </div>

      <ImportPanel
        onClose={() => setImportOpen(false)}
        onCommitted={applyImportedItems}
        open={importOpen}
        tracks={registrationTracks}
      />
    </main>
  );
}

function mergeTimelineItem(
  existing: TimelineItem | undefined,
  incoming: TimelineItem,
): TimelineItem {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    detail: incoming.detail ?? existing.detail,
    sources: incoming.sources ?? existing.sources,
  };
}

function mergeTimelineItems(
  current: TimelineItem[],
  incoming: TimelineItem[],
): TimelineItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, mergeTimelineItem(byId.get(item.id), item));
  }
  return Array.from(byId.values());
}
