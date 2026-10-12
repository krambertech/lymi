import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CHANGELOG_FIGURES } from "./lib/changelog-figures";

/** One folder per update, named `YYYY-MM-DD-slug`, holding `en.md`, `uk.md` and `ru.md`. */
const changelog = defineCollection({
  loader: glob({ pattern: "*/{en,uk,ru}.md", base: "./src/content/changelog" }),
  schema: z.object({
    title: z.string().min(1),
    /** One sentence: the page's description, the feed's summary and, later, the in-app notice. */
    summary: z.string().min(1),
    figure: z.enum(CHANGELOG_FIGURES).optional(),
    /** Shown from `<locale>-<theme>.webp` beside the update; `capture` is the recipe en.md keeps. */
    screenshot: z
      .object({
        frame: z.enum(["window", "phone", "panel"]),
        alt: z.string().min(1),
        capture: z
          .object({
            persona: z.string().optional(),
            path: z.string().startsWith("/"),
            element: z.string().optional(),
            prepare: z
              .array(z.union([z.string(), z.object({ route: z.string(), body: z.unknown() })]))
              .optional(),
            keys: z.array(z.string()).optional(),
            wait: z.number().optional(),
            theme: z.enum(["light", "dark"]).optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export const collections = { changelog };
