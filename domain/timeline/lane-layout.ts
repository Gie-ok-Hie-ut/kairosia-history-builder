export interface LaneInput {
  id: string;
  start: number;
  end: number;
}

export interface LaneResult {
  id: string;
  lane: number;
}

export function assignLanes(items: LaneInput[], gap = 6): LaneResult[] {
  const sorted = [...items].sort(
    (a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id),
  );
  const laneEnds: number[] = [];

  return sorted.map((item) => {
    const normalizedEnd = Math.max(item.start, item.end);
    let lane = laneEnds.findIndex((laneEnd) => item.start >= laneEnd + gap);

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(normalizedEnd);
    } else {
      laneEnds[lane] = normalizedEnd;
    }

    return { id: item.id, lane };
  });
}
