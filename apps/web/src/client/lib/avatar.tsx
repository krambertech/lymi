import type { AvatarOut } from "@lymi/core";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { ApiError } from "./api";

export type Avatar = AvatarOut;

/**
 * What the learner's photo is. The persisted copy is only a placeholder until the refetch
 * lands: another device, or a reload before the cache was written, may have changed it.
 */
export const avatarQuery = queryOptions({
  queryKey: ["avatar"],
  queryFn: () => avatarRequest<Avatar>("/api/avatar"),
  staleTime: 0,
});

/**
 * The photo's bytes, by version. Kept only in memory, never in the persisted cache, and
 * fetched past the HTTP cache so another account on this browser cannot find them there.
 */
export function avatarImageQuery(version: string | null | undefined) {
  return queryOptions({
    queryKey: ["avatar", "image", version],
    queryFn: async () => {
      const res = await fetch(`/api/avatar/${version}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new ApiError(res.status, "Avatar unavailable");
      return res.blob();
    },
    enabled: Boolean(version),
    staleTime: Number.POSITIVE_INFINITY,
    // A replaced photo's bytes are never asked for again; do not keep them for the session.
    gcTime: 60_000,
    retry: 1,
    meta: { persist: false },
  });
}

export function uploadAvatar(image: Blob, revision: number) {
  return avatarRequest<Avatar>("/api/avatar", {
    method: "PUT",
    body: image,
    headers: {
      "content-type": image.type || "application/octet-stream",
      "if-match": `"${revision}"`,
    },
  });
}

export function removeAvatar(revision: number) {
  return avatarRequest<Avatar>("/api/avatar", {
    method: "DELETE",
    headers: { "if-match": `"${revision}"` },
  });
}

async function avatarRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, credentials: "include" });
  } catch {
    throw new ApiError(0, "Offline");
  }
  if (!res.ok) throw new ApiError(res.status, "Avatar request failed");
  return (await res.json()) as T;
}

/** An object URL for a blob, revoked when the blob changes or the component goes. */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!(blob instanceof Blob)) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

/**
 * The learner's photo as the chrome shows it. `src` is undefined while there is none to
 * show; `pending` is true while a photo is known to exist but has not arrived, so the plate
 * can stay blank instead of flashing the initial first.
 */
export interface LearnerAvatar {
  src: string | undefined;
  pending: boolean;
}

const LearnerAvatarCtx = createContext<LearnerAvatar>({ src: undefined, pending: false });

export function LearnerAvatarProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const value = useLearnerAvatarSource(enabled);
  return <LearnerAvatarCtx.Provider value={value}>{children}</LearnerAvatarCtx.Provider>;
}

export function useLearnerAvatar(): LearnerAvatar {
  return useContext(LearnerAvatarCtx);
}

function useLearnerAvatarSource(enabled: boolean): LearnerAvatar {
  const avatar = useQuery({ ...avatarQuery, enabled });
  const version = enabled ? avatar.data?.version : null;
  const image = useQuery(avatarImageQuery(version));
  const src = useObjectUrl(image.data);
  return {
    src,
    pending: enabled && (avatar.isPending || (Boolean(version) && image.isPending && !src)),
  };
}
