import { z } from "zod";
import {
  daysInHistoricalMonth,
  toOrdinal,
} from "../timeline/historical-date";

const historicalInstantSchema = z
  .object({
    year: z.number().int().min(1).max(1_000_000),
    era: z.enum(["BCE", "CE"]),
    month: z.number().int().min(1).max(12).nullable().optional(),
    day: z.number().int().min(1).max(31).nullable().optional(),
    precision: z.enum(["exact", "year", "decade", "century", "estimated"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.month != null || value.day != null) &&
      value.precision !== "exact"
    ) {
      context.addIssue({
        code: "custom",
        message: "월과 일은 precision이 exact일 때만 사용할 수 있습니다.",
      });
    }
    if (value.day != null && value.month == null) {
      context.addIssue({
        code: "custom",
        message: "일을 입력하려면 월도 입력해야 합니다.",
        path: ["day"],
      });
    }
    if (
      value.month != null &&
      value.day != null &&
      value.day > daysInHistoricalMonth(value.year, value.era, value.month)
    ) {
      context.addIssue({
        code: "custom",
        message: "선택한 월에 존재하지 않는 날짜입니다.",
        path: ["day"],
      });
    }
  });

const sourceSchema = z
  .object({
    type: z.enum(["primary", "secondary", "reference", "web"]),
    title: z.string().trim().min(1).max(300),
    author: z.string().trim().max(200).nullable().optional(),
    publishedYear: z.number().int().min(1).max(1_000_000).nullable().optional(),
    url: z.string().url().max(2_000).nullable().optional(),
    locator: z.string().trim().max(120).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

const locationSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    precision: z.enum(["exact", "approximate"]),
  })
  .strict();

export const importItemSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    type: z.enum(["event", "person", "book", "idea", "organization", "technology"]),
    time: z
      .object({
        start: historicalInstantSchema,
        end: historicalInstantSchema.nullable(),
        basis: z.enum([
          "point",
          "duration",
          "lifespan",
          "activity",
          "publication",
          "existence",
        ]),
      })
      .strict(),
    trackKeys: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    importance: z.enum(["core", "major", "detail"]),
    summary: z.string().trim().min(1).max(280),
    detailMarkdown: z.string().trim().max(20_000).default(""),
    recordLevel: z.enum(["simple", "standard", "rigorous"]),
    confidence: z.enum(["high", "medium", "low", "disputed"]),
    uncertaintyNote: z.string().trim().max(1_000).nullable().optional(),
    location: locationSchema.nullable().optional(),
    sources: z.array(sourceSchema).max(30).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.time.end) {
      try {
        if (toOrdinal(value.time.end) < toOrdinal(value.time.start)) {
          context.addIssue({
            code: "custom",
            path: ["time", "end"],
            message: "종료 시점은 시작 시점보다 빠를 수 없습니다.",
          });
        }
      } catch {
        // The nested instant schema reports invalid calendar fields.
      }
    }

    if (value.recordLevel === "standard") {
      if (!value.detailMarkdown) {
        context.addIssue({
          code: "custom",
          path: ["detailMarkdown"],
          message: "보통 수준 기록에는 상세 설명이 필요합니다.",
        });
      }
      if (value.sources.length < 1) {
        context.addIssue({
          code: "custom",
          path: ["sources"],
          message: "보통 수준 기록에는 출처가 하나 이상 필요합니다.",
        });
      }
    }

    if (value.recordLevel === "rigorous" && value.sources.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "엄밀 수준 기록에는 출처가 두 개 이상 필요합니다.",
      });
    }

    if (value.confidence === "disputed" && !value.uncertaintyNote) {
      context.addIssue({
        code: "custom",
        path: ["uncertaintyNote"],
        message: "논쟁적 항목에는 불확실성 설명이 필요합니다.",
      });
    }
  });

export const importPayloadSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    items: z.array(importItemSchema).min(1).max(50),
  })
  .strict();

export const registrationPayloadSchema = importPayloadSchema.refine(
  (payload) => payload.items.length === 1,
  {
    path: ["items"],
    message: "사건 등록은 한 번에 하나만 지원합니다.",
  },
);

export type ImportItem = z.infer<typeof importItemSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;

export function formatSchemaIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}
