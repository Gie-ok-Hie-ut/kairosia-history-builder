import { formatSchemaIssues } from "@/domain/import/schema";
import { trackOrderUpdateSchema } from "@/domain/timeline/track-order-schema";
import { requireAdminRequest } from "@/server/auth/require-admin";
import {
  reorderTimelineTracks,
  TimelineTrackOrderValidationError,
} from "@/server/use-cases/reorder-timeline-tracks";

export async function PATCH(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = trackOrderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "Track 순서를 확인해 주세요.",
        issues: formatSchemaIssues(parsed.error),
      },
      { status: 400 },
    );
  }

  try {
    const tracks = await reorderTimelineTracks(parsed.data.trackKeys);
    return Response.json({ ok: true, tracks });
  } catch (error) {
    if (error instanceof TimelineTrackOrderValidationError) {
      return Response.json(
        { ok: false, message: error.message },
        { status: 400 },
      );
    }
    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Track 순서 저장에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}
