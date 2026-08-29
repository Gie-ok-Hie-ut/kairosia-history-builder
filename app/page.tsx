import { HistoryWorkspace } from "@/components/HistoryWorkspace";
import { getTimelineDataset } from "@/server/use-cases/get-timeline";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dataset = await getTimelineDataset();
  return <HistoryWorkspace dataset={dataset} />;
}
