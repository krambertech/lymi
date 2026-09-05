import { GradeInput } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, parseBody } from "../http";
import type { AppEnv } from "../index";
import { gradeCard, reviewQueue } from "../services";

export const review = new Hono<AppEnv>();

review.get("/queue", async (c) => {
  const limit = c.req.query("limit");
  return c.json(
    await reviewQueue(ctxOf(c), {
      deckId: c.req.query("deck"),
      limit: limit ? Number(limit) : undefined,
    }),
  );
});

review.post("/grade", async (c) =>
  c.json(await gradeCard(ctxOf(c), await parseBody(c, GradeInput, "grade"))),
);
