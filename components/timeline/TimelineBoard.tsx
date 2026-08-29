"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Bookmark, EyeOff } from "lucide-react";
import { formatHistoricalRange } from "@/domain/timeline/historical-date";
import {
  createTimelineScale,
  type TimelineMode,
} from "@/domain/timeline/time-scale";
import type { TimelineItem, TimelineTrack } from "@/domain/timeline/types";
import {
  createCenturyPhaseBands,
  createTimelineTicks,
  createTimelineVisualItems,
  formatTimelineCursorLabel,
  getTimelineImportanceRank,
  getTimelineBounds,
  positionTimelineVisualItems,
} from "@/domain/timeline/visual-layout";

const AXIS_WIDTH = 124;
const TRACK_WIDTH = 244;
const HEADER_HEIGHT = 48;
const CARD_MIN_HEIGHT = 38;

interface TimelineBoardProps {
  items: TimelineItem[];
  scaleItems: TimelineItem[];
  tracks: TimelineTrack[];
  mode: TimelineMode;
  pixelsPerYear: number;
  selectedItemId: string | null;
  jumpTarget: { ordinal: number; nonce: number } | null;
  onSelectItem: (item: TimelineItem) => void;
}

export function TimelineBoard({
  items,
  scaleItems,
  tracks,
  mode,
  pixelsPerYear,
  selectedItemId,
  jumpTarget,
  onSelectItem,
}: TimelineBoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const hoverGuideRef = useRef<HTMLDivElement>(null);
  const hoverLabelRef = useRef<HTMLSpanElement>(null);
  const [viewport, setViewport] = useState({ top: 0, height: 1_000 });
  const trackKeys = useMemo(() => tracks.map((track) => track.key), [tracks]);
  const visualItems = useMemo(
    () => createTimelineVisualItems(items, trackKeys),
    [items, trackKeys],
  );
  const scaleVisualItems = useMemo(
    () => createTimelineVisualItems(scaleItems, trackKeys),
    [scaleItems, trackKeys],
  );
  const bounds = useMemo(() => getTimelineBounds(scaleItems), [scaleItems]);
  const scale = useMemo(
    () =>
      createTimelineScale({
        start: bounds.start,
        end: bounds.end,
        pixelsPerYear,
        mode,
        items: scaleVisualItems,
        gapThreshold: Math.min(36, Math.max(1, 160 / pixelsPerYear)),
        anchorPaddingYears: Math.min(
          7,
          Math.max(0.25, 48 / pixelsPerYear),
        ),
      }),
    [bounds, mode, pixelsPerYear, scaleVisualItems],
  );
  const previousScaleRef = useRef(scale);

  useLayoutEffect(() => {
    const previousScale = previousScaleRef.current;
    previousScaleRef.current = scale;
    const node = scrollRef.current;
    if (!node || previousScale === scale) return;

    const bodyCenter =
      Math.max(0, node.scrollTop - HEADER_HEIGHT) + node.clientHeight / 2;
    const centerOrdinal = previousScale.ordinalAt(bodyCenter);
    node.scrollTop = Math.max(
      0,
      scale.position(centerOrdinal) + HEADER_HEIGHT - node.clientHeight / 2,
    );
    setViewport({ top: node.scrollTop, height: node.clientHeight });
  }, [scale]);

  useEffect(() => {
    if (!jumpTarget || !scrollRef.current) return;
    const target = scale.position(jumpTarget.ordinal) + HEADER_HEIGHT - 120;
    scrollRef.current.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [jumpTarget, scale]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => {
      setViewport({ top: node.scrollTop, height: node.clientHeight });
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (scrollFrameRef.current != null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const ticks = useMemo(
    () =>
      createTimelineTicks(
        bounds.start,
        bounds.end,
        pixelsPerYear,
        scale.position,
      ),
    [bounds, pixelsPerYear, scale.position],
  );
  const centuryPhases = useMemo(
    () =>
      createCenturyPhaseBands(bounds.start, bounds.end, scale.position),
    [bounds, scale.position],
  );
  const bodyHeight = Math.max(920, scale.height + 120);
  const boardWidth = AXIS_WIDTH + tracks.length * TRACK_WIDTH;
  const positioned = useMemo(
    () =>
      positionTimelineVisualItems(
        visualItems,
        trackKeys,
        scale.position,
        CARD_MIN_HEIGHT,
      ),
    [scale.position, trackKeys, visualItems],
  );
  const visibleRange = useMemo(() => {
    const overscan = Math.max(500, viewport.height);
    const top = Math.max(0, viewport.top - HEADER_HEIGHT);
    return {
      start: Math.max(0, top - overscan),
      end: top + viewport.height + overscan,
    };
  }, [viewport]);
  const visiblePositioned = useMemo(
    () =>
      positioned
        .filter(
          ({ top, height }) =>
            top + height >= visibleRange.start && top <= visibleRange.end,
        )
        .sort((left, right) => {
          const durationDifference =
            right.visual.endOrdinal -
            right.visual.startOrdinal -
            (left.visual.endOrdinal - left.visual.startOrdinal);
          if (durationDifference !== 0) return durationDifference;
          const bookmarkDifference =
            Number(left.visual.item.bookmarked) -
            Number(right.visual.item.bookmarked);
          if (bookmarkDifference !== 0) return bookmarkDifference;
          return (
            getTimelineImportanceRank(left.visual.item) -
            getTimelineImportanceRank(right.visual.item)
          );
        }),
    [positioned, visibleRange],
  );
  const visibleTicks = useMemo(
    () =>
      ticks.filter(
        (tick) =>
          tick.top >= visibleRange.start - 80 &&
          tick.top <= visibleRange.end + 80,
      ),
    [ticks, visibleRange],
  );
  const visibleCenturyPhases = useMemo(
    () =>
      centuryPhases.filter(
        (phase) =>
          phase.top + phase.height >= visibleRange.start - 80 &&
          phase.top <= visibleRange.end + 80,
      ),
    [centuryPhases, visibleRange],
  );
  const trackCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of visualItems) {
      counts.set(item.trackKey, (counts.get(item.trackKey) ?? 0) + 1);
    }
    return counts;
  }, [visualItems]);

  function updateViewport() {
    hideHoverGuide();
    if (scrollFrameRef.current != null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const node = scrollRef.current;
      if (!node) return;
      setViewport({ top: node.scrollTop, height: node.clientHeight });
    });
  }

  function updateHoverGuide(event: MouseEvent<HTMLDivElement>) {
    const guide = hoverGuideRef.current;
    const label = hoverLabelRef.current;
    if (!guide || !label) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const top = Math.min(bodyHeight, Math.max(0, event.clientY - rect.top));
    const left = Math.min(boardWidth - 112, Math.max(8, event.clientX - rect.left + 12));
    const ordinal = scale.ordinalAt(top);

    guide.style.setProperty("--hover-x", `${left}px`);
    guide.style.transform = `translateY(${top}px)`;
    guide.classList.add("is-visible");
    label.textContent = formatTimelineCursorLabel(ordinal, pixelsPerYear);
  }

  function hideHoverGuide() {
    hoverGuideRef.current?.classList.remove("is-visible");
  }

  return (
    <div className="timeline-scroll" onScroll={updateViewport} ref={scrollRef}>
      <div
        className="timeline-stage"
        style={{ width: boardWidth, minHeight: bodyHeight + HEADER_HEIGHT }}
      >
        <div
          className="timeline-header-row"
          style={{
            gridTemplateColumns:
              AXIS_WIDTH + "px repeat(" + tracks.length + ", " + TRACK_WIDTH + "px)",
          }}
        >
          <div className="timeline-header-axis">세기 / 연도</div>
          {tracks.map((track) => (
            <div className="timeline-track-header" key={track.key}>
              <span
                className="track-color-line"
                style={{ backgroundColor: track.color }}
              />
              <span>{track.name}</span>
              <span className="track-item-count">
                {trackCounts.get(track.key) ?? 0}
              </span>
            </div>
          ))}
        </div>

        <div
          className="timeline-body"
          onMouseLeave={hideHoverGuide}
          onMouseMove={updateHoverGuide}
          style={{ height: bodyHeight, top: HEADER_HEIGHT }}
        >
          <div className="timeline-grid" aria-hidden="true">
            {tracks.map((track, index) => (
              <div
                className="timeline-track-band"
                key={track.key}
                style={{
                  left: AXIS_WIDTH + index * TRACK_WIDTH,
                  width: TRACK_WIDTH,
                }}
              />
            ))}
            {scale.segments
              .filter((segment) => segment.compressed)
              .map((segment) => (
                <div
                  className="compressed-segment"
                  key={segment.start + "-" + segment.end}
                  style={{
                    top: segment.top,
                    height: Math.max(
                      12,
                      (segment.end - segment.start) * segment.pixelsPerYear,
                    ),
                    left: AXIS_WIDTH,
                    width: tracks.length * TRACK_WIDTH,
                  }}
                >
                  <span>
                    {formatCompressedYears(segment.end - segment.start)}년 압축 구간
                  </span>
                </div>
              ))}
          </div>

          <div className="timeline-axis">
            <div className="timeline-century-phases" aria-hidden="true">
              {visibleCenturyPhases.map((phase) => (
                <div
                  className="timeline-century-phase"
                  key={phase.key}
                  style={{ top: phase.top, height: phase.height }}
                >
                  <span>{phase.label}</span>
                </div>
              ))}
            </div>
            {visibleTicks.map((tick) => (
              <div
                className="timeline-tick"
                key={tick.ordinal}
                style={{ top: tick.top }}
              >
                <span>{tick.label}</span>
                <i style={{ width: tracks.length * TRACK_WIDTH }} />
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            className="timeline-hover-guide"
            ref={hoverGuideRef}
          >
            <span ref={hoverLabelRef} />
          </div>

          <div className="timeline-items-layer">
            {visiblePositioned.map(({ visual, top, height, lane }) => {
              const trackIndex = tracks.findIndex(
                (track) => track.key === visual.trackKey,
              );
              const laneOffset = Math.min(lane, 10) * 10;
              const track = tracks[trackIndex];
              return (
                <button
                  className={
                    "timeline-card" +
                    (selectedItemId === visual.item.id ? " is-selected" : "") +
                    (height > 54 ? " is-duration" : "") +
                    (visual.item.visibility === "hidden" ? " is-hidden" : "") +
                    (visual.item.bookmarked ? " is-bookmarked" : "") +
                    (visual.item.bookmarked || visual.item.visibility === "hidden"
                      ? " has-indicators"
                      : "")
                  }
                  key={visual.visualId}
                  onClick={() => onSelectItem(visual.item)}
                  style={{
                    top,
                    height,
                    left: AXIS_WIDTH + trackIndex * TRACK_WIDTH + 9 + laneOffset,
                    width: TRACK_WIDTH - 18 - laneOffset,
                    borderLeftColor: track.color,
                  }}
                  title={
                    visual.item.title +
                    " · " +
                    formatHistoricalRange(visual.item.time) +
                    (visual.item.visibility === "hidden" ? " · 숨김" : "") +
                    (visual.item.bookmarked ? " · 북마크" : "")
                  }
                  type="button"
                >
                  {visual.item.bookmarked ||
                  visual.item.visibility === "hidden" ? (
                    <span className="timeline-card-indicators">
                      {visual.item.bookmarked ? (
                        <Bookmark
                          aria-hidden="true"
                          className="timeline-card-bookmark-icon"
                          fill="currentColor"
                          size={11}
                        />
                      ) : null}
                      {visual.item.visibility === "hidden" ? (
                        <EyeOff aria-hidden="true" size={11} />
                      ) : null}
                    </span>
                  ) : null}
                  <span className="timeline-card-year">
                    {formatHistoricalRange(visual.item.time)}
                  </span>
                  <strong>{visual.item.title}</strong>
                  {height > 68 ? <small>{visual.item.summary}</small> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCompressedYears(years: number) {
  return years >= 10 ? String(Math.round(years)) : years.toFixed(1);
}
