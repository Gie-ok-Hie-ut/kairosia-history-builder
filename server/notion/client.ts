const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2026-03-11";
const MAX_ATTEMPTS = 4;

export class NotionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "NotionApiError";
  }
}

export function isNotionConfigured(): boolean {
  return Boolean(
    process.env.NOTION_API_KEY &&
      process.env.NOTION_TRACKS_DATA_SOURCE_ID &&
      process.env.NOTION_ITEMS_DATA_SOURCE_ID,
  );
}

export async function notionRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new NotionApiError("Notion API key is not configured.", 503);
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(NOTION_API_BASE + path, {
      ...init,
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_API_VERSION,
        ...init.headers,
      },
    });

    if (response.ok) return (await response.json()) as T;

    const body = (await response.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;
    const retryable = response.status === 429 || response.status === 529;
    if (!retryable || attempt === MAX_ATTEMPTS - 1) {
      throw new NotionApiError(
        body?.message ?? "Notion request failed.",
        response.status,
        body?.code,
      );
    }

    const retryAfter = Number(response.headers.get("retry-after") ?? "1");
    await delay(Math.max(250, retryAfter * 1_000 + attempt * 200));
  }

  throw new NotionApiError("Notion request failed after retries.", 503);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
