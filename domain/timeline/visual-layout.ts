import { assignLanes } from "./lane-layout";
import {
  fromOrdinal,
  fromPreciseOrdinal,
  getRangeOrdinals,
} from "./historical-date";
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
        return {
          id: visual.visualId,
          start: top,
          end: bottom,
          priority: getTimelineImportanceRank(visual.item),
        };
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
  const step = getTickStep(pixelsPerYear);
  const ticks: Array<{ ordinal: number; top: number; label: string }> = [];
  let lastTop = -Infinity;
  const firstIndex = Math.ceil((start - 1e-9) / step);

  for (let index = firstIndex; ; index += 1) {
    const ordinal = normalizeOrdinal(index * step);
    if (ordinal > end + 1e-9) break;
    const top = position(ordinal);
    if (top - lastTop < 34) continue;
    ticks.push({
      ordinal,
      top,
      label: formatTickLabel(ordinal, step),
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
  const wholeYear = Math.floor(ordinal);
  const date = fromOrdinal(wholeYear);
  const century = Math.ceil(date.year / 100);
  const centuryStart = Math.floor((wholeYear - 1) / 100) * 100 + 1;
  const progress = wholeYear - centuryStart;
  const phase = progress < 33 ? "초반" : progress < 66 ? "중반" : "후반";
  const centuryLabel = date.era === "BCE" ? `BCE ${century}C` : `${century}C`;
  return {
    era: date.era,
    century,
    phase,
    label: `${centuryLabel} ${phase}`,
  };
}

export function formatTimelineCursorLabel(
  ordinal: number,
  pixelsPerYear = 0,
): string {
  const wholeYear = Math.floor(ordinal);
  const date = fromOrdinal(wholeYear);
  const yearLabel = date.era === "BCE" ? `BCE ${date.year}` : String(date.year);
  const precise = fromPreciseOrdinal(ordinal);
  const preciseLabel =
    pixelsPerYear >= 120
      ? `${yearLabel}년 ${precise.month}월 ${precise.day}일`
      : pixelsPerYear >= 40
        ? `${yearLabel}년 ${precise.month}월`
        : yearLabel;
  const century = getCenturyPhase(wholeYear);
  return `${preciseLabel}, ${century.century}C ${century.phase}`;
}

export function getTimelineImportanceRank(
  item: Pick<TimelineItem, "importance">,
) {
  return item.importance === "core" ? 3 : item.importance === "major" ? 2 : 1;
}

function roundDown(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function getTickStep(pixelsPerYear: number) {
  const targetYears = 40 / pixelsPerYear;
  const steps = [1 / 12, 1 / 6, 1 / 4, 1 / 2, 1, 2, 5, 10, 25, 50, 100];
  return steps.find((step) => step >= targetYears) ?? 250;
}

function formatTickLabel(ordinal: number, step: number) {
  if (step < 1) {
    const date = fromPreciseOrdinal(ordinal);
    const year = date.era === "BCE" ? `BCE ${date.year}` : String(date.year);
    return `${year} ${date.month}월`;
  }
  const date = fromOrdinal(Math.round(ordinal));
  return date.era === "BCE" ? "BCE " + date.year : String(date.year);
}

function normalizeOrdinal(value: number) {
  return Math.round(value * 1_000_000_000) / 1_000_000_000;
}
