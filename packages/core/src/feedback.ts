import { z } from "zod";
import { AppLanguage } from "./types";

/** What the learner is writing about. The kind goes in the subject of the message Lymi receives. */
export const FeedbackKind = z.enum(["bug", "idea", "other"]);
export type FeedbackKind = z.infer<typeof FeedbackKind>;

/** How many notes one learner may send in one of their own days. */
export const FEEDBACK_DAILY_LIMIT = 20;

export const FEEDBACK_MESSAGE_MAX = 4000;

export const FeedbackInput = z.object({
  kind: FeedbackKind,
  message: z.string().trim().min(1).max(FEEDBACK_MESSAGE_MAX),
  screen: z
    .string()
    .trim()
    .max(200)
    .meta({ description: "The path the learner was on when they wrote" }),
  language: AppLanguage.meta({ description: "The app language the learner is reading" }),
});
export type FeedbackInput = z.infer<typeof FeedbackInput>;
