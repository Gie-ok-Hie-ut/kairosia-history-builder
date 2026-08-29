import type { TimelineVisibility } from "@/domain/timeline/types";
import { requireAdminRequest } from "@/server/auth/require-admin";
import {
  setTimelineItemVisibility,
  TimelineItemVisibilityNotFoundError,
} from "@/server/use-cases/set-timeline-item-visibility";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    visibility?: unknown;
  } | null;
  if (body?.visibility !== "published" && body?.visibility !== "hidden") {
    return Response.json(
      { ok: false, message: "표시 상태는 published 또는 hidden이어야 합니다." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const item = await setTimelineItemVisibility(
      id,
      body.visibility as TimelineVisibility,
    );
    return Response.json({ ok: true, item });
  } catch (error) {
    if (error instanceof TimelineItemVisibilityNotFoundError) {
      return Response.json({ ok: false, message: error.message }, { status: 404 });
    }
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "표시 상태 변경에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}
