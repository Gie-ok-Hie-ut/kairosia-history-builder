import { requireAdminRequest } from "@/server/auth/require-admin";
import {
  formatSchemaIssues,
  registrationPayloadSchema,
} from "@/domain/import/schema";
import { commitImport } from "@/server/use-cases/commit-import";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "유효한 JSON이 아닙니다." },
      { status: 400 },
    );
  }

  const parsed = registrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: formatSchemaIssues(parsed.error)
          .map((issue) => issue.message)
          .join(" "),
      },
      { status: 400 },
    );
  }

  try {
    const result = await commitImport(parsed.data);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "등록에 실패했습니다.",
      },
      { status: 503 },
    );
  }
}
