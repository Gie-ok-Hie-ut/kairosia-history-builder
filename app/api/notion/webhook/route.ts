import { invalidateTimelineCache } from "@/server/cache/timeline-cache";
import { verifyNotionWebhook } from "@/server/notion/verify-webhook";

function isVerificationPayload(
  value: unknown,
): value is { verification_token: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "verification_token" in value &&
    typeof value.verification_token === "string"
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (isVerificationPayload(payload)) {
    console.info(
      "Notion webhook verification token:",
      payload.verification_token,
    );
    return Response.json({ accepted: true });
  }

  const verificationToken = process.env.NOTION_WEBHOOK_TOKEN;
  if (!verificationToken) {
    return Response.json(
      { error: "Notion webhook is not configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("x-notion-signature");
  if (
    !signature ||
    !(await verifyNotionWebhook(rawBody, signature, verificationToken))
  ) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  invalidateTimelineCache();
  return Response.json({ accepted: true });
}
