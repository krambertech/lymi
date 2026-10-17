import { Hono } from "hono";
import { createSpeechProviders } from "../ai";
import { tooManyRequests } from "../auth-rate-limit";
import { describe } from "../http";
import type { AppEnv } from "../index";
import { spendPublicAudio } from "../public-audio-rate-limit";
import { publisherAvatar } from "../services";
import { publicMediaFile, publicPronunciation } from "../services/public-media";

/** A published deck's own media. The product Worker checks the publication on every request. */
export const publicMedia = new Hono<AppEnv>();

publicMedia.get(
  "/card/:cardId/:kind",
  describe({ hide: true, open: true, errors: [404, 503] }),
  async (c) => {
    const kind = c.req.param("kind");
    if (kind !== "image" && kind !== "audio") return c.notFound();
    let object: R2ObjectBody;
    if (kind === "image") {
      object = await publicMediaFile(c.get("db"), c.req.param("cardId"), kind, {
        images: c.env.PRIVATE_IMAGES,
        audio: c.env.AUDIO,
      });
    } else {
      const found = await publicPronunciation(
        c.get("db"),
        c.req.param("cardId"),
        { bucket: c.env.AUDIO, providers: (language) => createSpeechProviders(c.env, language) },
        () => spendPublicAudio(c),
      );
      if ("retryAfter" in found) return tooManyRequests(found.retryAfter);
      object = found.clip;
    }
    const audioType = object.httpMetadata?.contentType === "audio/wav" ? "audio/wav" : "audio/mpeg";
    const headers = new Headers({
      "Content-Type": kind === "image" ? "image/webp" : audioType,
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
