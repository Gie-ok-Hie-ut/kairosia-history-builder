export function requireAdminRequest(request: Request): Response | null {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const hostname = new URL(request.url).hostname;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (process.env.NODE_ENV !== "production" && isLocalhost) {
    return null;
  }

  const email = [
    "cf-access-authenticated-user-email",
    "oai-authenticated-user-email",
  ]
    .map((header) => request.headers.get(header)?.trim().toLowerCase())
    .find(Boolean);
  if (email && allowedEmails.includes(email)) return null;

  return Response.json(
    { ok: false, message: "관리자 권한이 필요합니다." },
    { status: 403 },
  );
}
