import { getTimelineItemDetail } from "@/server/use-cases/get-timeline";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = await getTimelineItemDetail(id);
  if (!item) {
    return Response.json({ message: "항목을 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json({ item });
}
