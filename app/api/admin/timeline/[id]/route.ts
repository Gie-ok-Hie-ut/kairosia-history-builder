import { requireAdminRequest } from "@/server/auth/require-admin";
import { formatSchemaIssues } from "@/domain/import/schema";
import { timelineItemUpdateSchema } from "@/domain/timeline/update-schema";
import { getAdminTimelineItemDetail } from "@/server/use-cases/get-admin-timeline";
import {
  deleteTimelineItem,
  TimelineItemNotFoundError,
} from "@/server/use-cases/delete-timeline-item";
import {
  TimelineItemUpdateNotFoundError,
  TimelineItemUpdateValidationError,
  updateTimelineItem,
} from "@/server/use-cases/update-timeline-item";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const { id } = await context.params;
  try {
    const item = await getAdminTimelineItemDetail(id);
    if (!item) {
      return Response.json(
        { ok: false, message: "항목을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
    return Response.json({ ok: true, item });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "항목 조회에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = timelineItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "수정할 내용을 확인해 주세요.",
        issues: formatSchemaIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const item = await updateTimelineItem(id, parsed.data);
    return Response.json({ ok: true, item });
  } catch (error) {
    if (error instanceof TimelineItemUpdateNotFoundError) {
      return Response.json({ ok: false, message: error.message }, { status: 404 });
    }
    if (error instanceof TimelineItemUpdateValidationError) {
      return Response.json({ ok: false, message: error.message }, { status: 400 });
    }
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "수정에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const { id } = await context.params;
  try {
    await deleteTimelineItem(id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof TimelineItemNotFoundError) {
      return Response.json({ ok: false, message: error.message }, { status: 404 });
    }
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "삭제에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}
