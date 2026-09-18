import { Hono } from "hono";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { publicMediaFile } from "../services/public-media";

/** Media is public only after the product Worker checks its live publication and approval. */
export const publicMedia = new Hono<AppEnv>();

publicMedia.get("/:approvalId", describe({ hide: true, open: true, errors: [404] }), async (c) => {
  const { kind, object } = await publicMediaFile(
    c.get("db"),
    c.req.param("approvalId"),
    { images: c.env.PRIVATE_IMAGES, audio: c.env.AUDIO },
    c.req.header("range"),
  );
  const headers = new Headers({
    "Content-Type": kind === "image" ? "image/webp" : "audio/mpeg",
    "Cache-Control": "no-store",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Content-Security-Policy": "default-src 'none'",
  });
  const returned = object.range;
  if (returned) {
    const start =
      "suffix" in returned ? Math.max(0, object.size - returned.suffix) : (returned.offset ?? 0);
    const length = "length" in returned ? returned.length : object.size - start;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { headers });
});
