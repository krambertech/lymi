import { z } from "zod";
import { AppLanguage, LearningKind } from "../types";
import { Timestamp } from "./common";

export const SettingsOut = z
  .object({
    userId: z.string(),
    appLanguage: AppLanguage.nullable().meta({
      description:
        "The language of the interface and reminders. Null until the learner has chosen.",
    }),
    meaningLanguage: z
      .string()
      .meta({ description: "The language meanings are written in. Follows the app language." }),
    dailyGoal: z.number().int().meta({
      description:
        "Recall attempts that satisfy a day's streak goal. 50 until the learner chooses, or 25 once they skip choosing while getting set up.",
    }),
    dailyGoalChosenAt: Timestamp.nullable().meta({
      description: "When the learner chose the goal. Null means the first review should ask.",
    }),
    reviewTimezone: z
      .string()
      .nullable()
      .meta({ description: "IANA zone that decides where a review day begins" }),
    reviewTimezoneMode: z.enum(["automatic", "manual"]),
    onboardedAt: Timestamp.nullable().meta({
      description: "When the learner finished or skipped getting set up. Null until then.",
    }),
    learningKind: LearningKind.nullable().meta({
      description: "What the learner said they are learning while getting set up.",
    }),
    learningLanguage: z.string().nullable().meta({
      description: "The language the learner said they are learning: a BCP 47 tag or a typed name.",
    }),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Settings" });
