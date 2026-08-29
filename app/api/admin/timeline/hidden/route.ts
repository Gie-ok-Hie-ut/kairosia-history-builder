import { requireAdminRequest } from "@/server/auth/require-admin";
import { getHiddenTimelineItems } from "@/server/use-cases/get-admin-timeline";

export async function GET(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  try {
    const items = await getHiddenTimelineItems();
    return Response.json({ ok: true, items });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "숨긴 사건을 불러오지 못했습니다.",
      },
      { status: 503 },
    );
  }
}
