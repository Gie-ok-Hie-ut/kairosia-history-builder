const HTTP_URL_PATTERN = /https?:\/\/[^\s\]\[()]+/gi;

function toHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizeSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const directUrl = toHttpUrl(value);
  if (directUrl) return directUrl === value ? null : directUrl;

  const urls = [...value.matchAll(HTTP_URL_PATTERN)]
    .map((match) => toHttpUrl(match[0]))
    .filter((url): url is string => Boolean(url));
  const uniqueUrls = [...new Set(urls)];

  return uniqueUrls.length === 1 ? uniqueUrls[0] : null;
}

export interface UrlNormalizationResult {
  value: unknown;
  normalizedCount: number;
}

/** Normalizes only unambiguous Markdown-wrapped source URLs before validation. */
export function normalizeImportSourceUrls(value: unknown): UrlNormalizationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { value, normalizedCount: 0 };
  }

  const payload = value as Record<string, unknown>;
  if (!Array.isArray(payload.items)) return { value, normalizedCount: 0 };

  let normalizedCount = 0;
  const items = payload.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const event = item as Record<string, unknown>;
    if (!Array.isArray(event.sources)) return item;

    const sources = event.sources.map((source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        return source;
      }
      const sourceRecord = source as Record<string, unknown>;
      const normalizedUrl = normalizeSourceUrl(sourceRecord.url);
      if (!normalizedUrl) return source;
      normalizedCount += 1;
      return { ...sourceRecord, url: normalizedUrl };
    });

    return { ...event, sources };
  });

  return {
    value: normalizedCount > 0 ? { ...payload, items } : value,
    normalizedCount,
  };
}
