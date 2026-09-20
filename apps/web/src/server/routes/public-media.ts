import { Hono } from "hono";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { publisherAvatar } from "../services";
import { publicMediaFile } from "../services/public-media";

/** A published deck's own media. The product Worker checks the publication on every request. */
export const publicMedia = new Hono<AppEnv>();

publicMedia.get(
  "/card/:cardId/:kind",
  describe({ hide: true, open: true, errors: [404] }),
  async (c) => {
    const kind = c.req.param("kind");
    if (kind !== "image" && kind !== "audio") return c.notFound();
    const object = await publicMediaFile(c.get("db"), c.req.param("cardId"), kind, {
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
  },
);

/**
 * A published deck's publisher photo. Publishing is the deliberate act that makes it public, so
 * the address carries the deck's slug and no account identifier reaches a public page. ADR 0016.
 */
publicMedia.get(
  "/deck/:slug/publisher-avatar",
  describe({ hide: true, open: true, errors: [404] }),
  async (c) => {
    const found = await publisherAvatar(c.get("db"), c.req.param("slug"));
    // Only the live version, so an address that outlived the photo never serves the newer one.
    if (!found || c.req.query("v") !== found.version) return c.notFound();
    const object = await c.env.PRIVATE_IMAGES.get(found.key);
    if (!object) return c.notFound();
    return new Response(object.body, {
      headers: new Headers({
        "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
        "Content-Length": String(object.size),
        // Withdrawing the deck has to stop the photo, which a cached copy would outlive.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        // lymi.app embeds this from my.lymi.app, which same-origin would block.
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Content-Security-Policy": "default-src 'none'",
      }),
    });
  },
);
