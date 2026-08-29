import type { Era, HistoricalInstant, HistoricalRange } from "./types";

export function toOrdinal(instant: Pick<HistoricalInstant, "year" | "era">): number {
  if (!Number.isInteger(instant.year) || instant.year < 1) {
    throw new RangeError("Historical years must be positive integers.");
  }

  return instant.era === "BCE" ? 1 - instant.year : instant.year;
}

export function fromOrdinal(ordinal: number): { year: number; era: Era } {
  if (!Number.isInteger(ordinal)) {
    throw new RangeError("Ordinal years must be integers.");
  }

  return ordinal <= 0
    ? { year: 1 - ordinal, era: "BCE" }
    : { year: ordinal, era: "CE" };
}

export function formatHistoricalYear(
  instant: Pick<HistoricalInstant, "year" | "era">,
): string {
  return instant.era === "BCE"
    ? "기원전 " + instant.year + "년"
    : instant.year + "년";
}

export function formatHistoricalRange(range: HistoricalRange): string {
  if (!range.end) return formatHistoricalYear(range.start);

  return (
    formatHistoricalYear(range.start) +
    " - " +
    formatHistoricalYear(range.end)
  );
}

export function parseHistoricalYearInput(
  value: string,
): { year: number; era: Era } | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;

  const match = normalized.match(/^(?:(BCE|BC|기원전)\s*)?(\d{1,6})(?:\s*(BCE|BC|CE|AD|기원전))?$/);
  if (!match) return null;

  const year = Number(match[2]);
  if (!Number.isInteger(year) || year < 1) return null;

  const marker = match[1] ?? match[3];
  const era: Era = marker === "BCE" || marker === "BC" || marker === "기원전"
    ? "BCE"
    : "CE";

  return { year, era };
}

export function getRangeOrdinals(range: HistoricalRange): {
  start: number;
  end: number;
} {
  const start = toOrdinal(range.start);
  const end = range.end ? toOrdinal(range.end) : start;
  return { start, end };
}
