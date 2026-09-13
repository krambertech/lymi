import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CardImage, QueueItem } from "./api";
import { meQuery } from "./queries";

/**
 * Card pictures kept for offline review. Each learner gets their own Cache Storage bucket, and
 * every bucket is dropped when the learner changes, so a shared browser never shows one
 * learner's pictures to another. The picture's URL carries its id, so a replaced picture is a
 * new entry rather than a stale one. The HTTP cache is not used: the server marks pictures
 * `no-cache`.
 */
const PREFIX = "lymi-card-images-";
/** A review looks this far ahead, and the bucket holds about two sessions of it. */
const LOOKAHEAD = 3;
const MAX_ENTRIES = 60;

const supported = () => typeof caches !== "undefined";

/** Drop every learner's pictures. Part of clearing the learner's state. */
export async function clearCardImages(): Promise<void> {
  if (!supported()) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith(PREFIX)).map((n) => caches.delete(n)));
}

async function bucketFor(userId: string): Promise<Cache> {
  const name = `${PREFIX}${userId}`;
  // Anything left under another learner's name is from before a switch that skipped sign-out.
  const names = await caches.keys();
  await Promise.all(
    names.filter((n) => n.startsWith(PREFIX) && n !== name).map((n) => caches.delete(n)),
  );
  return caches.open(name);
}

async function trim(bucket: Cache) {
  const keys = await bucket.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((k) => bucket.delete(k)),
  );
}

const inflight = new Map<string, Promise<Blob>>();

/** The picture's bytes: from this learner's bucket, or fetched once and kept there. */
function loadPicture(userId: string | undefined, url: string): Promise<Blob> {
  const key = `${userId ?? ""}:${url}`;
  const running = inflight.get(key);
  if (running) return running;
  const load = (async () => {
    // Only product URLs are kept; the design page's drawn pictures are data URLs.
    const cacheable = supported() && /^https?:$/.test(new URL(url, location.href).protocol);
    const bucket = userId && cacheable ? await bucketFor(userId) : null;
    const hit = await bucket?.match(url);
    if (hit) return hit.blob();
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Picture request failed with ${response.status}`);
    if (bucket) {
      await bucket.put(url, response.clone());
      void trim(bucket);
    }
    return response.blob();
  })().finally(() => inflight.delete(key));
  inflight.set(key, load);
  return load;
}

export type PictureStatus = "loading" | "ready" | "failed";

/** An object URL for the picture, released when the component lets go of it. */
export function useCardPicture(image: Pick<CardImage, "url"> | null | undefined): {
  src: string | null;
  status: PictureStatus;
} {
  const me = useQuery(meQuery);
  const userId = me.data?.id;
  const url = image?.url;
  const [state, setState] = useState<{ url: string; src: string | null; status: PictureStatus }>();

  useEffect(() => {
    if (!url) return;
    let alive = true;
    let objectUrl: string | null = null;
    setState({ url, src: null, status: "loading" });
    loadPicture(userId, url).then(
      (blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url, src: objectUrl, status: "ready" });
      },
      () => alive && setState({ url, src: null, status: "failed" }),
    );
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, userId]);

  if (!url) return { src: null, status: "failed" };
  if (state?.url !== url) return { src: null, status: "loading" };
  return { src: state.src, status: state.status };
}

/** Warm the bucket for the card on screen and the next few, so a picture is there offline. */
export function usePrefetchPictures(items: readonly QueueItem[], index: number) {
  const me = useQuery(meQuery);
  const userId = me.data?.id;
  const urls = items
    .slice(index, index + 1 + LOOKAHEAD)
    .flatMap((item) => (item.card.image ? [item.card.image.url] : []))
    .join(" ");
  useEffect(() => {
    if (!userId || !urls) return;
    for (const url of urls.split(" ")) void loadPicture(userId, url).catch(() => undefined);
  }, [userId, urls]);
}
