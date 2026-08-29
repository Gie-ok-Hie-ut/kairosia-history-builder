import type { TimelineVisualItem } from "./types";

export type TimelineMode = "absolute" | "compressed";

interface ScaleSegment {
  start: number;
  end: number;
  top: number;
  pixelsPerYear: number;
  compressed: boolean;
}

export interface TimelineScale {
  height: number;
  position: (ordinal: number) => number;
  ordinalAt: (top: number) => number;
  segments: ScaleSegment[];
}

interface ScaleOptions {
  start: number;
  end: number;
  pixelsPerYear: number;
  mode: TimelineMode;
  items: TimelineVisualItem[];
  gapThreshold?: number;
  compressedGapHeight?: number;
  anchorPaddingYears?: number;
}

export function createTimelineScale({
  start,
  end,
  pixelsPerYear,
  mode,
  items,
  gapThreshold = 36,
  compressedGapHeight = 24,
  anchorPaddingYears = 7,
}: ScaleOptions): TimelineScale {
  if (end <= start) throw new RangeError("Timeline end must be after start.");

  if (mode === "absolute") {
    const segment: ScaleSegment = {
      start,
      end,
      top: 0,
      pixelsPerYear,
      compressed: false,
    };
    return {
      height: (end - start) * pixelsPerYear,
      position: (ordinal) => (clamp(ordinal, start, end) - start) * pixelsPerYear,
      ordinalAt: (top) => start + clamp(top, 0, segmentHeight(segment)) / pixelsPerYear,
      segments: [segment],
    };
  }

  const anchors = new Set<number>();
  for (const visual of items) {
    anchors.add(visual.startOrdinal);
    anchors.add(visual.endOrdinal);
  }
  const occupied = mergeIntervals(
    Array.from(anchors, (anchor) => ({
      start: Math.max(start, anchor - anchorPaddingYears),
      end: Math.min(end, anchor + anchorPaddingYears),
    })),
  );

  const segments: ScaleSegment[] = [];
  let cursor = start;
  let top = 0;

  for (const interval of occupied) {
    if (interval.start > cursor) {
      const gapYears = interval.start - cursor;
      const compressed = gapYears >= gapThreshold;
      const gapRate = compressed ? compressedGapHeight / gapYears : pixelsPerYear;
      segments.push({
        start: cursor,
        end: interval.start,
        top,
        pixelsPerYear: gapRate,
        compressed,
      });
      top += gapYears * gapRate;
    }

    if (interval.end > Math.max(cursor, interval.start)) {
      const segmentStart = Math.max(cursor, interval.start);
      segments.push({
        start: segmentStart,
        end: interval.end,
        top,
        pixelsPerYear,
        compressed: false,
      });
      top += (interval.end - segmentStart) * pixelsPerYear;
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < end) {
    const gapYears = end - cursor;
    const compressed = gapYears >= gapThreshold;
    const gapRate = compressed ? compressedGapHeight / gapYears : pixelsPerYear;
    segments.push({
      start: cursor,
      end,
      top,
      pixelsPerYear: gapRate,
      compressed,
    });
    top += gapYears * gapRate;
  }

  if (segments.length === 0) {
    return createTimelineScale({
      start,
      end,
      pixelsPerYear,
      mode: "absolute",
      items,
    });
  }

  return {
    height: top,
    segments,
    position: (ordinal) => {
      const year = clamp(ordinal, start, end);
      const segment =
        segments.find((entry, index) =>
          year >= entry.start &&
          (year < entry.end || index === segments.length - 1),
        ) ?? segments[segments.length - 1];
      return segment.top + (year - segment.start) * segment.pixelsPerYear;
    },
    ordinalAt: (pixelTop) => {
      const y = clamp(pixelTop, 0, top);
      const segment =
        segments.find((entry, index) => {
          const bottom = entry.top + segmentHeight(entry);
          return y >= entry.top && (y < bottom || index === segments.length - 1);
        }) ?? segments[segments.length - 1];
      return segment.start + (y - segment.top) / segment.pixelsPerYear;
    },
  };
}

function segmentHeight(segment: ScaleSegment) {
  return (segment.end - segment.start) * segment.pixelsPerYear;
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>) {
  const sorted = intervals
    .filter((interval) => interval.end >= interval.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
    } else {
      previous.end = Math.max(previous.end, interval.end);
    }
  }
  return merged;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
