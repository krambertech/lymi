import type {
  AccountDeletionInput,
  AccountDeletionOut,
  AvatarOut,
  DeletionCodeOut,
} from "@lymi/core";
import { request } from "./request";

export type Me = { id: string; name: string; email: string };

/** The photo's revision guards a change made from two places at once. */
const revisionHeader = (revision: number) => ({ "if-match": `"${revision}"` });

export const accountApi = {
  me: () => request<Me>("/api/me"),
  rename: (name: string) =>
    request<Me>("/api/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  avatar: () => request<AvatarOut>("/api/avatar"),
  /** Any still picture; the server crops it square. */
  uploadAvatar: (image: Blob, revision: number) =>
    request<AvatarOut>("/api/avatar", {
      method: "PUT",
      body: image,
      headers: { "content-type": image.type || "image/jpeg", ...revisionHeader(revision) },
    }),
  removeAvatar: (revision: number) =>
    request<AvatarOut>("/api/avatar", { method: "DELETE", headers: revisionHeader(revision) }),
  deletion: () => request<AccountDeletionOut>("/api/me/deletion"),
  sendDeletionCode: () => request<DeletionCodeOut>("/api/me/deletion/code", { method: "POST" }),
  /** Final: the account and everything it holds are gone once this resolves. */
  deleteAccount: (input: AccountDeletionInput) =>
    request<{ ok: true }>("/api/me", { method: "DELETE", body: JSON.stringify(input) }),
};
