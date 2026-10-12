import { z } from "zod";

/** Timestamps are ISO 8601 strings in JSON. Shared by every response that carries one. */
export const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

/**
 * Marks a response field that may gain a value or a branch: every supported phone release shows
 * an unknown one safely. Leave it off a field only on purpose. ADR 0032.
 */
export const OPEN = { "x-lymi-open": true } as const;

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

/** A phone release below the minimum version gets this with 426. ADR 0032. */
export const UpdateRequiredOut = ErrorOut.extend({
  code: z.literal("update_required"),
  updateUrl: z.string().optional().meta({
    description: "Where this platform's app gets its new version, when one is configured",
  }),
}).meta({ id: "UpdateRequired" });
