import { Hono } from "hono";
import { createSpeechProviders } from "../ai";
import { tooManyRequests } from "../auth-rate-limit";
import { exampleAudioAllowance } from "../example-audio-rate-limit";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { leadInDependencies } from "../lead-ins";
import { exampleAudio, pronunciationAudio } from "../services";

export const audio = new Hono<AppEnv>();

audio.get("/:cardId/example", describe({ hide: true, errors: [400, 404, 503] }), async (c) => {
  const work = exampleAudio(
    ctxOf(c),
    c.req.param("cardId"),
    {
      bucket: c.env.AUDIO,
      providers: (language) => createSpeechProviders(c.env, language),
      storedOnly: c.req.query("stored") === "1",
    },
    exampleAudioAllowance(c),
  );
  // A learner who moves on mid-generation still gets the clip stored, and its lease released.
  c.executionCtx.waitUntil(work.catch(() => undefined));
  const found = await work;
  if ("retryAfter" in found) return tooManyRequests(found.retryAfter);
  return clipResponse(found.clip);
});

audio.get("/:cardId", describe({ hide: true, errors: [400, 404, 503] }), async (c) => {
  const work = pronunciationAudio(ctxOf(c), c.req.param("cardId"), {
    bucket: c.env.AUDIO,
    leadIns: leadInDependencies(c.env),
    providers: (language) => createSpeechProviders(c.env, language),
    storedOnly: c.req.query("stored") === "1",
  });
  // A learner who moves on mid-generation still gets the clip stored, and its lease released.
  c.executionCtx.waitUntil(work.catch(() => undefined));
  return clipResponse(await work);
});

function clipResponse(object: R2ObjectBody): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", String(object.size));
  // The durable cache is R2. Do not let authenticated card audio survive in a shared browser cache.
  headers.set("Cache-Control", "private, no-store");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
