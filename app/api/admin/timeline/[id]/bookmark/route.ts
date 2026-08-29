import { requireAdminRequest } from "@/server/auth/require-admin";
import {
  setTimelineItemBookmark,
  TimelineItemBookmarkNotFoundError,
} from "@/server/use-cases/set-timeline-item-bookmark";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    bookmarked?: unknown;
  } | null;
  if (typeof body?.bookmarked !== "boolean") {
    return Response.json(
      { ok: false, message: "북마크 상태는 boolean이어야 합니다." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const item = await setTimelineItemBookmark(id, body.bookmarked);
    return Response.json({ ok: true, item });
  } catch (error) {
    if (error instanceof TimelineItemBookmarkNotFoundError) {
      return Response.json({ ok: false, message: error.message }, { status: 404 });
    }
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "북마크 상태 변경에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}
