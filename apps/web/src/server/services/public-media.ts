import { livePublicationMedia } from "@lymi/core/publication-media";
import type { Db } from "../db";
import { ServiceError } from "./context";

export type PublicMediaKind = "image" | "audio";

/** A public route may read bytes only while the publication, the card and the asset are live. */
export async function publicMediaFile(
  db: Db,
  cardId: string,
  kind: PublicMediaKind,
  storage: { images: R2Bucket; audio: R2Bucket },
): Promise<R2ObjectBody> {
  const [row] = await livePublicationMedia(db, { cardId }, "delivery");
  const key = kind === "image" ? row?.imageKey : row?.audioKey;
  if (!key) throw new ServiceError("not_found", "Media not found");
  const object = await storage[kind === "image" ? "images" : "audio"].get(key);
  if (!object) throw new ServiceError("not_found", "Media not found");
  return object;
}
