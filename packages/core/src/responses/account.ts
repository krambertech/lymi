import { z } from "zod";

export const MeOut = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })
  .meta({ id: "Me" });

/** The learner's photo, for the app only. `version` is null when the initial shows instead. */
export const AvatarOut = z
  .object({
    source: z.enum(["custom", "google"]).nullable(),
    version: z.string().nullable(),
    revision: z.number().int(),
    /** A Google photo is stored, so removing the learner's own photo brings it back. */
    hasGoogle: z.boolean(),
  })
  .meta({ id: "Avatar" });
export type AvatarOut = z.infer<typeof AvatarOut>;
