import { getRangeOrdinals } from "@/domain/timeline/historical-date";
import { getTimelineDataset } from "@/server/use-cases/get-timeline";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = numberParam(url.searchParams.get("fromOrdinal"));
  const to = numberParam(url.searchParams.get("toOrdinal"));
  const tracks = new Set(
    (url.searchParams.get("tracks") ?? "").split(",").filter(Boolean),
  );
  const importance = importanceParam(url.searchParams.get("importance"));
  const offset = integerParam(url.searchParams.get("cursor"), 0, 0, 1_000_000);
  const limit = integerParam(url.searchParams.get("limit"), 250, 1, 500);
  const dataset = await getTimelineDataset();

  const matches = dataset.items
    .filter((item) => {
      const range = getRangeOrdinals(item.time);
      const inRange =
        (from == null || range.end >= from) &&
        (to == null || range.start <= to);
      const inTrack =
        tracks.size === 0 || item.trackKeys.some((key) => tracks.has(key));
      const inImportance =
        IMPORTANCE_RANK[item.importance] <= IMPORTANCE_RANK[importance];
      return inRange && inTrack && inImportance;
    })
    .sort((left, right) => {
      const dateDifference =
        getRangeOrdinals(left.time).start - getRangeOrdinals(right.time).start;
      return dateDifference || left.id.localeCompare(right.id);
    });
  const items = matches.slice(offset, offset + limit);
  const nextOffset = offset + items.length;

  return Response.json({
    source: dataset.source,
    tracks: dataset.tracks,
    items,
    pageInfo: {
      total: matches.length,
      nextCursor: nextOffset < matches.length ? String(nextOffset) : null,
    },
  });
}

const IMPORTANCE_RANK = { core: 0, major: 1, detail: 2 } as const;

function numberParam(value: string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerParam(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = value == null ? fallback : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function importanceParam(value: string | null): keyof typeof IMPORTANCE_RANK {
  return value === "core" || value === "major" || value === "detail"
    ? value
    : "detail";
}
