import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { CardImage, QueueItem } from "./api";
import { meQuery } from "./queries";

/** Card pictures kept per learner in Cache Storage for offline review; the rules are in docs/design/library-decks-and-cards.md. */
const PREFIX = "lymi-card-images-";
/** A review looks this far ahead, and the bucket holds about two sessions of it. */
const LOOKAHEAD = 3;
const MAX_ENTRIES = 60;

const supported = () => typeof caches !== "undefined";

/** Each learner's bucket, opened once per page, or null where Cache Storage refuses. */
const buckets = new Map<string, Promise<Cache | null>>();

/** Drop every learner's pictures, as part of clearing the learner's state. */
export async function clearCardImages(): Promise<void> {
  buckets.clear();
  if (!supported()) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => n.startsWith(PREFIX)).map((n) => caches.delete(n)));
}

function bucketFor(userId: string): Promise<Cache | null> {
  const opened = buckets.get(userId);
  if (opened) return opened;
  const name = `${PREFIX}${userId}`;
  const opening = (async () => {
    try {
      // Anything under another learner's name is from a switch that skipped sign-out.
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith(PREFIX) && n !== name).map((n) => caches.delete(n)),
      );
      return await caches.open(name);
    } catch {
      return null;
    }
  })();
  buckets.set(userId, opening);
  return opening;
}

async function trim(bucket: Cache) {
  const keys = await bucket.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((k) => bucket.delete(k)),
  );
}

const inflight = new Map<string, Promise<Blob>>();

/** The picture's bytes from this learner's bucket, or fetched and kept there when the bucket works. */
function loadPicture(userId: string | undefined, url: string): Promise<Blob> {
  const key = `${userId ?? ""}:${url}`;
  const running = inflight.get(key);
  if (running) return running;
  const load = (async () => {
    // Only product URLs are kept; the design page's drawn pictures are data URLs.
    const cacheable = supported() && /^https?:$/.test(new URL(url, location.href).protocol);
    const bucket = userId && cacheable ? await bucketFor(userId) : null;
    const hit = await bucket?.match(url).catch(() => undefined);
    if (hit) return hit.blob();
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Picture request failed with ${response.status}`);
    if (bucket) {
      // A full or refusing bucket only costs the offline copy, never the picture on screen.
      await bucket
        .put(url, response.clone())
        .then(() => trim(bucket))
        .catch(() => undefined);
    }
    return response.blob();
  })().finally(() => inflight.delete(key));
  inflight.set(key, load);
  return load;
}

export type PictureStatus = "loading" | "ready" | "failed";

/** Whether a loaded picture has no see-through pixel, sampled without smoothing so alpha stays exact. */
export function isOpaque(img: HTMLImageElement): boolean {
  const side = 32;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.imageSmoothingEnabled = false;
  context.drawImage(img, 0, 0, side, side);
  try {
    const { data } = context.getImageData(0, 0, side, side);
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return false;
    return true;
  } catch {
    // A cross-origin picture taints the canvas; without an answer it keeps no edge.
    return false;
  }
}

/** An object URL for the picture, released when the component lets go of it. */
export function useCardPicture(image: Pick<CardImage, "url"> | null | undefined): {
  src: string | null;
  status: PictureStatus;
} {
  const me = useQuery(meQuery);
  // Waiting for the learner keeps a cold start from loading uncached and then again cached.
  const ready = !me.isPending;
  const userId = me.data?.id;
  const url = image?.url;
  const [state, setState] = useState<{ url: string; src: string | null; status: PictureStatus }>();

  useEffect(() => {
    if (!url || !ready) return;
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
  }, [url, userId, ready]);

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
