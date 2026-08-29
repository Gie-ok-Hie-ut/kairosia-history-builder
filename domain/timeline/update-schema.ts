import { z } from "zod";

const uniqueStrings = (maximumItems: number, maximumLength: number) =>
  z
    .array(z.string().trim().min(1).max(maximumLength))
    .max(maximumItems)
    .transform((values) => Array.from(new Set(values)));

export const timelineItemUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    type: z.enum(["event", "person", "book", "idea", "organization", "technology"]),
    trackKeys: uniqueStrings(10, 100).pipe(z.array(z.string()).min(1)),
    tags: uniqueStrings(30, 60),
    importance: z.enum(["core", "major", "detail"]),
    summary: z.string().trim().min(1).max(280),
    confidence: z.enum(["high", "medium", "low", "disputed"]),
    uncertaintyNote: z.string().trim().max(1_000).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.confidence === "disputed" && !value.uncertaintyNote) {
      context.addIssue({
        code: "custom",
        path: ["uncertaintyNote"],
        message: "논쟁적 항목에는 불확실성 설명이 필요합니다.",
      });
    }
  });

export type TimelineItemUpdate = z.infer<typeof timelineItemUpdateSchema>;
