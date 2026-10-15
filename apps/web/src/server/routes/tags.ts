import { TagOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { listTags } from "../services";

export const tags = new Hono<AppEnv>();

tags.get(
  "/",
  describe({
    tags: ["Tags"],
    summary: "List tags",
    description:
      "Every tag on an active card in a deck you study, your own and joined ones alike, most used first. The same name is one tag across decks. A deck you read in another edition shows no tags until editions name them.",
    ok: { schema: z.array(TagOut), description: "Tags" },
    errors: [],
  }),
  async (c) => c.json(await listTags(ctxOf(c))),
);
