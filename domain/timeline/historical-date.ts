import type { Era, HistoricalInstant, HistoricalRange } from "./types";

const COMMON_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function toOrdinal(
  instant: Pick<HistoricalInstant, "year" | "era" | "month" | "day">,
): number {
  if (!Number.isInteger(instant.year) || instant.year < 1) {
    throw new RangeError("Historical years must be positive integers.");
  }

  const base = instant.era === "BCE" ? 1 - instant.year : instant.year;
  const month = instant.month ?? null;
  const day = instant.day ?? null;
  if (month == null) {
    if (day != null) throw new RangeError("A historical day requires a month.");
    return base;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Historical months must be between 1 and 12.");
  }

  const monthDays = daysInHistoricalMonth(instant.year, instant.era, month);
  if (day != null && (!Number.isInteger(day) || day < 1 || day > monthDays)) {
    throw new RangeError("Historical day is outside the selected month.");
  }

  const daysInYear = isLeapHistoricalYear(instant.year, instant.era) ? 366 : 365;
  const daysBeforeMonth = Array.from(
    { length: month - 1 },
    (_, index) => daysInHistoricalMonth(instant.year, instant.era, index + 1),
  ).reduce((total, value) => total + value, 0);
  const dayOffset = day == null ? (monthDays - 1) / 2 : day - 1;
  return base + (daysBeforeMonth + dayOffset) / daysInYear;
}

export function fromOrdinal(ordinal: number): { year: number; era: Era } {
  if (!Number.isInteger(ordinal)) {
    throw new RangeError("Ordinal years must be integers.");
  }

  return ordinal <= 0
    ? { year: 1 - ordinal, era: "BCE" }
    : { year: ordinal, era: "CE" };
}

export function fromPreciseOrdinal(ordinal: number): {
  year: number;
  era: Era;
  month: number;
  day: number;
} {
  if (!Number.isFinite(ordinal)) {
    throw new RangeError("Ordinal date must be finite.");
  }

  const wholeYear = Math.floor(ordinal);
  const date = fromOrdinal(wholeYear);
  const daysInYear = isLeapHistoricalYear(date.year, date.era) ? 366 : 365;
  let dayOfYear = Math.min(
    daysInYear - 1,
    Math.max(0, Math.floor((ordinal - wholeYear) * daysInYear + 1e-7)),
  );

  for (let month = 1; month <= 12; month += 1) {
    const monthDays = daysInHistoricalMonth(date.year, date.era, month);
    if (dayOfYear < monthDays) {
      return { ...date, month, day: dayOfYear + 1 };
    }
    dayOfYear -= monthDays;
  }

  return { ...date, month: 12, day: 31 };
}

export function daysInHistoricalMonth(
  year: number,
  era: Era,
  month: number,
): number {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError("Historical years must be positive integers.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Historical months must be between 1 and 12.");
  }
  if (month === 2 && isLeapHistoricalYear(year, era)) return 29;
  return COMMON_MONTH_DAYS[month - 1];
}

export function formatHistoricalYear(
  instant: Pick<HistoricalInstant, "year" | "era">,
): string {
  return instant.era === "BCE"
    ? "기원전 " + instant.year + "년"
    : instant.year + "년";
}

export function formatHistoricalInstant(
  instant: Pick<HistoricalInstant, "year" | "era" | "month" | "day">,
): string {
  const year = formatHistoricalYear(instant);
  if (instant.month == null) return year;
  const month = ` ${instant.month}월`;
  return instant.day == null ? year + month : year + month + ` ${instant.day}일`;
}

export function formatHistoricalRange(range: HistoricalRange): string {
  if (!range.end) return formatHistoricalInstant(range.start);

  return (
    formatHistoricalInstant(range.start) +
    " - " +
    formatHistoricalInstant(range.end)
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

function isLeapHistoricalYear(year: number, era: Era) {
  const astronomicalYear = era === "BCE" ? 1 - year : year;
  return (
    astronomicalYear % 4 === 0 &&
    (astronomicalYear % 100 !== 0 || astronomicalYear % 400 === 0)
  );
}
