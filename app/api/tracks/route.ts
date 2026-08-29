import { getTimelineDataset } from "@/server/use-cases/get-timeline";

export async function GET() {
  const dataset = await getTimelineDataset();
  return Response.json({ source: dataset.source, tracks: dataset.tracks });
}
