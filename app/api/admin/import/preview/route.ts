import { requireAdminRequest } from "@/server/auth/require-admin";
import {
  formatSchemaIssues,
  registrationPayloadSchema,
} from "@/domain/import/schema";
import { previewImport } from "@/server/use-cases/preview-import";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        errors: [{ path: "root", message: "유효한 JSON이 아닙니다." }],
      },
      { status: 400 },
    );
  }

  const parsed = registrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json(
      { ok: false, errors: formatSchemaIssues(parsed.error) },
      { status: 400 },
    );
  }

  const result = await previewImport(parsed.data);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
