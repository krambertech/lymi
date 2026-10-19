import { Hono } from "hono";
import { createSpeechProviders } from "../ai";
import { createJapaneseContextProvider } from "../ai/japanese-audio-context";
import { meteredFetch } from "../dependency-health";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { pronunciationAudio } from "../services";

export const audio = new Hono<AppEnv>();

const noop = () => {};

audio.get("/:cardId", describe({ hide: true, errors: [400, 404, 503] }), async (c) => {
  const work = pronunciationAudio(ctxOf(c), c.req.param("cardId"), {
    bucket: c.env.AUDIO,
    japaneseContext: createJapaneseContextProvider(c.env, meteredFetch(c.env, "gemini_text")),
    providers: (language) => createSpeechProviders(c.env, language),
    storedOnly: c.req.query("stored") === "1",
  });
  // A learner who moves on mid-generation still gets the clip stored, and its lease released.
  c.executionCtx.waitUntil(work.then(noop, noop));
  const object = await work;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", String(object.size));
  // The durable cache is R2. Do not let authenticated card audio survive in a shared browser cache.
  headers.set("Cache-Control", "private, no-store");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});
