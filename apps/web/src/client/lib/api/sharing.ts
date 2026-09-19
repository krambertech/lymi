import type { InvitationOut, JoinLinkOut, JoinOut, JoinPreviewOut, MemberOut } from "@lymi/core";
import { request } from "./request";

/** Someone studying a deck they do not own. The owner is not one of these. */
export type Member = MemberOut;
/** An address asked into a deck that has not joined yet. */
export type Invitation = InvitationOut;

export const sharingApi = {
  joinLink: (deckId: string) => request<JoinLinkOut>(`/api/decks/${deckId}/join-link`),
  turnOnJoinLink: (deckId: string) =>
    request<JoinLinkOut>(`/api/decks/${deckId}/join-link`, { method: "POST" }),
  turnOffJoinLink: (deckId: string) =>
    request<{ ok: true }>(`/api/decks/${deckId}/join-link`, { method: "DELETE" }),
  members: (deckId: string) => request<Member[]>(`/api/decks/${deckId}/members`),
  removeMember: (deckId: string, memberId: string) =>
    request<{ ok: true }>(`/api/decks/${deckId}/members/${encodeURIComponent(memberId)}`, {
      method: "DELETE",
    }),
  invitations: (deckId: string) => request<Invitation[]>(`/api/decks/${deckId}/invitations`),
  invite: (deckId: string, email: string) =>
    request<Invitation>(`/api/decks/${deckId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  cancelInvitation: (deckId: string, invitationId: string) =>
    request<{ ok: true }>(`/api/decks/${deckId}/invitations/${invitationId}`, { method: "DELETE" }),
  joinPreview: (token: string) => request<JoinPreviewOut>(`/api/join/${encodeURIComponent(token)}`),
  /** Holds the link in a short-lived cookie so the sign-in that follows joins the deck. */
  holdJoinLink: (token: string) =>
    request<{ ok: true }>(`/api/join/${encodeURIComponent(token)}/sign-in`, { method: "POST" }),
  join: (token: string) =>
    request<JoinOut>(`/api/join/${encodeURIComponent(token)}`, { method: "POST" }),
};
