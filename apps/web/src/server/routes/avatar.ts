import { IMAGE_LIMITS } from "@lymi/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { avatarImage, getAvatar, removeAvatar, uploadAvatar } from "../services";
import { ServiceError } from "../services/context";
import { readAtMost } from "../services/images";

/** The learner's photo. Account identity, so every route is the learner's own session only. */
export const avatar = new Hono<AppEnv>();

const learnerOnly = { hide: true, learnerOnly: true } as const;

avatar.get("/", describe(learnerOnly), async (c) => c.json(await getAvatar(ctxOf(c))));

avatar.get("/:version", describe({ ...learnerOnly, errors: [404] }), async (c) => {
  const object = await avatarImage(ctxOf(c), storageOf(c), c.req.param("version"));
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
      "Content-Length": String(object.size),
      // Held by the app's query cache instead, which sign-out clears.
      "Cache-Control": "private, no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

avatar.put("/", describe({ ...learnerOnly, errors: [400, 409, 503] }), async (c) => {
  const revision = baseRevision(c);
  const declared = Number(c.req.header("content-length"));
  if (Number.isFinite(declared) && declared > IMAGE_LIMITS.maxBytes) throw tooLarge();
  const bytes = await readAtMost(c.req.raw.body, IMAGE_LIMITS.maxBytes);
  if (!bytes) throw tooLarge();
  return c.json(await uploadAvatar(ctxOf(c), storageOf(c), bytes, revision));
});

avatar.delete("/", describe({ ...learnerOnly, errors: [400, 409] }), async (c) =>
  c.json(await removeAvatar(ctxOf(c), storageOf(c), baseRevision(c))),
);

function storageOf(c: Context<AppEnv>) {
  return { bucket: c.env.PRIVATE_IMAGES, images: c.env.IMAGES };
}

/** `If-Match: "<revision>"`, the revision the learner's choice was made from. */
function baseRevision(c: Context<AppEnv>): number {
  const match = /^"?(\d{1,9})"?$/.exec(c.req.header("if-match")?.trim() ?? "");
  if (!match?.[1]) {
    const message = "Send If-Match with the avatar revision this change was made from.";
    throw new ServiceError("invalid", "Invalid avatar change", [{ message }]);
  }
  return Number(match[1]);
}

function tooLarge() {
  const message = "That image is too large. Use one under 10 MB and 12,000 pixels on a side.";
  return new ServiceError("invalid", message, [{ message, reason: "too_large" }]);
}
