import { z } from "zod";

export const trackOrderUpdateSchema = z
  .object({
    trackKeys: z
      .array(z.string().trim().min(1, "Track Key가 비어 있습니다."))
      .min(1, "Track이 하나 이상 필요합니다.")
      .max(50, "Track은 50개를 초과할 수 없습니다."),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.trackKeys).size === value.trackKeys.length) return;
    context.addIssue({
      code: "custom",
      message: "중복된 Track Key가 있습니다.",
      path: ["trackKeys"],
    });
  });

export type TrackOrderUpdate = z.infer<typeof trackOrderUpdateSchema>;
