import { z } from "zod";

/** Timestamps are ISO 8601 strings in JSON. Shared by every response that carries one. */
export const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

export const OkOut = z.object({ ok: z.literal(true) }).meta({ id: "Ok" });

export const ErrorOut = z
  .object({
    error: z.string().meta({ description: "What went wrong, in plain words" }),
    code: z.string().optional().meta({
      description:
        "A stable name for a refusal a tool may act on, such as `description_reveals_answer`",
    }),
    issues: z
      .array(z.unknown())
      .optional()
      .meta({ description: "On 400, what failed: Zod issues, or the refusal's details" }),
  })
  .meta({ id: "Error" });
