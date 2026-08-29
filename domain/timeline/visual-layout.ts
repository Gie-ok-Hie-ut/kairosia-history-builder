import { assignLanes } from "./lane-layout";
import { fromOrdinal, getRangeOrdinals } from "./historical-date";
import type { Era, TimelineItem, TimelineVisualItem } from "./types";

export interface PositionedTimelineVisual {
  visual: TimelineVisualItem;
  top: number;
  height: number;
  lane: number;
}

export interface CenturyPhaseBand {
  key: string;
  era: Era;
  century: number;
  phase: "초반" | "중반" | "후반";
  label: string;
  startOrdinal: number;
  endOrdinal: number;
  top: number;
  height: number;
}

export interface CenturyPhase {
  era: Era;
  century: number;
  phase: "초반" | "중반" | "후반";
  label: string;
}

export function createTimelineVisualItems(
  items: TimelineItem[],
  trackKeys: string[],
): TimelineVisualItem[] {
  const activeKeys = new Set(trackKeys);
  return items.flatMap((item) => {
    const range = getRangeOrdinals(item.time);
    return item.trackKeys
      .filter((trackKey) => activeKeys.has(trackKey))
      .map((trackKey) => ({
        visualId: item.id + ":" + trackKey,
        trackKey,
        item,
        startOrdinal: range.start,
        endOrdinal: range.end,
      }));
  });
}

export function positionTimelineVisualItems(
  visuals: TimelineVisualItem[],
  trackKeys: string[],
  position: (ordinal: number) => number,
  cardMinHeight: number,
): PositionedTimelineVisual[] {
  const laneById = new Map<string, number>();

  for (const trackKey of trackKeys) {
    const trackItems = visuals
      .filter((visual) => visual.trackKey === trackKey)
      .map((visual) => {
        const top = position(visual.startOrdinal);
        const bottom =
          visual.endOrdinal === visual.startOrdinal
            ? top + cardMinHeight
            : Math.max(top + cardMinHeight, position(visual.endOrdinal));
        return { id: visual.visualId, start: top, end: bottom };
      });
    for (const result of assignLanes(trackItems, 7)) {
      laneById.set(result.id, result.lane);
    }
  }

  return visuals.map((visual) => {
    const top = position(visual.startOrdinal);
    const end = position(visual.endOrdinal);
    return {
      visual,
      top,
      height:
        visual.endOrdinal === visual.startOrdinal
          ? cardMinHeight
          : Math.max(cardMinHeight, end - top),
      lane: laneById.get(visual.visualId) ?? 0,
    };
  });
}

export function getTimelineBounds(items: TimelineItem[]) {
  if (!items.length) return { start: 1900, end: 2030 };
  const ranges = items.map((item) => getRangeOrdinals(item.time));
  const earliest = Math.min(...ranges.map((range) => range.start));
  const latest = Math.max(...ranges.map((range) => range.end));
  return {
    start: roundDown(earliest - 18, 10),
    end: roundUp(latest + 8, 10),
  };
}

export function createTimelineTicks(
  start: number,
  end: number,
  pixelsPerYear: number,
  position: (ordinal: number) => number,
) {
  const step = pixelsPerYear >= 5 ? 10 : pixelsPerYear >= 3 ? 25 : 50;
  const ticks: Array<{ ordinal: number; top: number; label: string }> = [];
  let lastTop = -Infinity;

  for (let ordinal = roundUp(start, step); ordinal <= end; ordinal += step) {
    const top = position(ordinal);
    if (top - lastTop < 34) continue;
    const date = fromOrdinal(ordinal);
    ticks.push({
      ordinal,
      top,
      label: date.era === "BCE" ? "BCE " + date.year : String(date.year),
    });
    lastTop = top;
  }
  return ticks;
}

export function createCenturyPhaseBands(
  start: number,
  end: number,
  position: (ordinal: number) => number,
  minimumHeight = 34,
): CenturyPhaseBand[] {
  const phaseOffsets = [0, 100 / 3, (100 / 3) * 2, 100];
  const firstCenturyStart = Math.floor((start - 1) / 100) * 100 + 1;
  const bands: CenturyPhaseBand[] = [];

  for (
    let centuryStart = firstCenturyStart;
    centuryStart <= end;
    centuryStart += 100
  ) {
    for (let index = 0; index < 3; index += 1) {
      const phaseStart = Math.max(start, centuryStart + phaseOffsets[index]);
      const phaseEnd = Math.min(end, centuryStart + phaseOffsets[index + 1]);
      if (phaseEnd <= phaseStart) continue;

      const top = position(phaseStart);
      const height = position(phaseEnd) - top;
      if (height < minimumHeight) continue;

      const descriptor = getCenturyPhase(phaseStart);

      bands.push({
        key: `${centuryStart}:${index}`,
        ...descriptor,
        startOrdinal: phaseStart,
        endOrdinal: phaseEnd,
        top,
        height,
      });
    }
  }

  return bands;
}

export function getCenturyPhase(ordinal: number): CenturyPhase {
  const rounded = Math.round(ordinal);
  const date = fromOrdinal(rounded);
  const century = Math.ceil(date.year / 100);
  const centuryStart = Math.floor((rounded - 1) / 100) * 100 + 1;
  const progress = rounded - centuryStart;
  const phase = progress < 33 ? "초반" : progress < 66 ? "중반" : "후반";
  const centuryLabel = date.era === "BCE" ? `BCE ${century}C` : `${century}C`;
  return {
    era: date.era,
    century,
    phase,
    label: `${centuryLabel} ${phase}`,
  };
}

export function formatTimelineCursorLabel(ordinal: number): string {
  const rounded = Math.round(ordinal);
  const date = fromOrdinal(rounded);
  const yearLabel = date.era === "BCE" ? `BCE ${date.year}` : String(date.year);
  const century = getCenturyPhase(rounded);
  return `${yearLabel}, ${century.century}C ${century.phase}`;
}

function roundDown(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}
