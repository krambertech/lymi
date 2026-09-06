import { Hono } from "hono";
import { createSpeechProviders } from "../ai";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { pronunciationAudio } from "../services";

export const audio = new Hono<AppEnv>();

audio.get("/:cardId", describe({ hide: true, errors: [400, 404, 503] }), async (c) => {
  const object = await pronunciationAudio(ctxOf(c), c.req.param("cardId"), {
    bucket: c.env.AUDIO,
    providers: (language) => createSpeechProviders(c.env, language),
  });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", String(object.size));
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});
