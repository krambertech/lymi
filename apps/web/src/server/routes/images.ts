import {
  CardImageImportInput,
  CardImagePatch,
  CardImageUploadFields,
  CardImageVersionInput,
  CardOut,
  IMAGE_LIMITS,
} from "@lymi/core";
import type { Context } from "hono";
import { Hono } from "hono";
import { body, ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import {
  archiveCardImage,
  cardImageFile,
  describeCardImage,
  importCardImage,
  restoreCardImage,
  ServiceError,
  uploadCardImage,
} from "../services";

/** A card's one picture, mounted under /api/cards. ADR 0014. */
export const images = new Hono<AppEnv>();

const deps = (c: Context<AppEnv>) => ({ bucket: c.env.PRIVATE_IMAGES, images: c.env.IMAGES });

const VERSION_RULE =
  "Send the card's `imageVersion` as `version` to get 409 instead of overwriting a newer change.";
const PRIVACY =
  "The picture is fetched or read once, checked by its bytes, normalized to a still WebP of at most 1600 pixels a side without metadata, and stored privately. " +
  "JPEG, PNG, WebP and still GIF are accepted up to 10 MB and 12,000 pixels a side; SVG and animation are refused. A failure leaves the current picture as it was.";
const DESCRIPTION_RULE =
  "`description` says what the picture shows without naming the term or meaning; picture review modes wait until the picture has one.";

images.put(
  "/:id/image",
  describe({
    tags: ["Pictures"],
    summary: "Upload a picture",
    description: `Needs the write scope and the deck's owner. Replaces the card's picture. ${PRIVACY} ${DESCRIPTION_RULE} ${VERSION_RULE} An empty \`version\` expects a card that never had a picture.`,
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["file"],
            properties: {
              file: { type: "string", format: "binary" },
              description: { type: "string", maxLength: 300 },
              version: { type: "string" },
            },
          },
        },
      },
    },
    ok: { schema: CardOut, description: "The card with its new picture" },
    errors: [400, 404, 409, 503],
  }),
  async (c) => {
    const declared = Number(c.req.header("content-length") ?? Number.NaN);
    if (!Number.isFinite(declared)) {
      throw new ServiceError("invalid", "Send the picture with a Content-Length header.");
    }
    if (declared > IMAGE_LIMITS.maxBytes + 64_000) {
      throw new ServiceError("invalid", "Send a picture under 10 MB.");
    }
    if (!/^multipart\/form-data\b/i.test(c.req.header("content-type") ?? "")) {
      throw new ServiceError(
        "invalid",
        "Send the picture as multipart/form-data with a file field.",
      );
    }
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ServiceError("invalid", "Send the picture in a file field.");
    if (file.size > IMAGE_LIMITS.maxBytes)
      throw new ServiceError("invalid", "Send a picture under 10 MB.");
    const version = form.get("version");
    const description = form.get("description");
    const fields = CardImageUploadFields.safeParse({
      ...(typeof description === "string" ? { description } : {}),
      ...(typeof version === "string" ? { version: version === "" ? null : version } : {}),
    });
    if (!fields.success) throw new ServiceError("invalid", "Invalid picture", fields.error.issues);
    const bytes = new Uint8Array(await file.arrayBuffer());
    return c.json(await uploadCardImage(ctxOf(c), c.req.param("id"), bytes, fields.data, deps(c)));
  },
);

images.post(
  "/:id/image/import",
  describe({
    tags: ["Pictures"],
    summary: "Import a picture from a link",
    description: `Needs the write scope and the deck's owner. Replaces the card's picture with a copy of a public http or https link; Lymi never shows the link itself and keeps only its host. Private and internal addresses are refused at every redirect. ${PRIVACY} ${DESCRIPTION_RULE} ${VERSION_RULE}`,
    ok: { schema: CardOut, description: "The card with its new picture" },
    errors: [400, 404, 409, 503],
  }),
  body(CardImageImportInput, "picture link"),
  async (c) =>
    c.json(await importCardImage(ctxOf(c), c.req.param("id"), c.req.valid("json"), deps(c))),
);

images.patch(
  "/:id/image",
  describe({
    tags: ["Pictures"],
    summary: "Describe the picture",
    description: `Needs the write scope and the deck's owner. ${DESCRIPTION_RULE} Null removes it and pauses the picture modes. ${VERSION_RULE}`,
    ok: { schema: CardOut, description: "The card after the change" },
    errors: [400, 404, 409],
  }),
  body(CardImagePatch, "picture description"),
  async (c) => c.json(await describeCardImage(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

images.post(
  "/:id/image/archive",
  describe({
    tags: ["Pictures"],
    summary: "Archive the picture",
    description: `Needs the write scope and the deck's owner. Hides the picture; picture modes pause and keep their schedules until restore. ${VERSION_RULE}`,
    ok: { schema: CardOut, description: "The card without its picture" },
    errors: [400, 404, 409],
  }),
  body(CardImageVersionInput, "picture version"),
  async (c) => c.json(await archiveCardImage(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

images.post(
  "/:id/image/restore",
  describe({
    tags: ["Pictures"],
    summary: "Restore the picture",
    description: `Needs the write scope and the deck's owner. Brings back the picture archived last, and the picture modes with their schedules. 409 when the card already has a picture. ${VERSION_RULE}`,
    ok: { schema: CardOut, description: "The card with its picture back" },
    errors: [400, 404, 409],
  }),
  body(CardImageVersionInput, "picture version"),
  async (c) => c.json(await restoreCardImage(ctxOf(c), c.req.param("id"), c.req.valid("json"))),
);

images.get(
  "/:id/image/:imageId",
  describe({
    tags: ["Pictures"],
    summary: "Get the picture",
    description:
      "The active picture as image/webp, for anyone who can read the card. The path changes when the picture does, and a replaced or archived picture is 404. Responses are private and never cached by the browser.",
    errors: [404],
  }),
  async (c) => {
    const { image, object } = await cardImageFile(
      ctxOf(c),
      c.req.param("id"),
      c.req.param("imageId"),
      c.env.PRIVATE_IMAGES,
    );
    const headers = new Headers({
      "Content-Type": image.contentType,
      // As with avatars, the browser keeps nothing; the app holds pictures in its own per-learner cache.
      "Cache-Control": "private, no-store",
      "Content-Length": String(object.size),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    });
    return new Response(object.body, { headers });
  },
);
