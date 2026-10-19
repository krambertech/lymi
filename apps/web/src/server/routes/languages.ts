import { LANGUAGE_FORMATS, LanguagesOut } from "@lymi/core";
import { Hono } from "hono";
import { describe } from "../http";
import type { AppEnv } from "../index";

/** Public: the formats are the same for every caller and change only with a deploy. */
export const languages = new Hono<AppEnv>();

languages.get(
  "/",
  describe({
    open: true,
    tags: ["Languages"],
    summary: "How each language's cards are written",
    description:
      "No key needed. For each language Lymi writes in its own format: what `pronunciation` holds, the notation an `example` carries its readings in, and when a second card is a duplicate. A card in any other language holds IPA or a plain respelling.",
    ok: { schema: LanguagesOut, description: "Every language with a format of its own" },
  }),
  (c) => {
    c.header("cache-control", "public, max-age=3600");
    return c.json({ languages: [...LANGUAGE_FORMATS] } satisfies LanguagesOut);
  },
);
