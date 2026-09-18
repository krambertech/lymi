import { Hono } from "hono";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { publicMediaFile } from "../services/public-media";

/** Media is public only after the product Worker checks its live publication and approval. */
export const publicMedia = new Hono<AppEnv>();

publicMedia.get("/:approvalId", describe({ hide: true, open: true, errors: [404] }), async (c) => {
  const { kind, object } = await publicMediaFile(c.get("db"), c.req.param("approvalId"), {
    images: c.env.PRIVATE_IMAGES,
    audio: c.env.AUDIO,
  });
  const headers = new Headers({
    "Content-Type": kind === "image" ? "image/webp" : "audio/mpeg",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "default-src 'none'",
  });
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
});
