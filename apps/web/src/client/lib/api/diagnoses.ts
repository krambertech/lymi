import type { FixInput, FixOut, ReviewOfferOut } from "@lymi/core";
import type { Card } from "./cards";
import { request } from "./request";

/** A drafted fix review offers after the reveal. ADR 0025. */
export type ReviewOffer = ReviewOfferOut;
/** What accepting a fix wrote, with cards in the shape the rest of the client reads. */
export type FixResult = Omit<FixOut, "added" | "edited"> & { added: Card[]; edited: Card | null };

export const diagnosesApi = {
  /** Review showed the fix; it is not offered in review again for this revision. */
  markOffered: (id: string) =>
    request<{ ok: true }>(`/api/diagnoses/${encodeURIComponent(id)}/offered`, { method: "POST" }),
  acceptFix: (id: string, body: FixInput) =>
    request<FixResult>(`/api/diagnoses/${encodeURIComponent(id)}/accept`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  undoFix: (id: string) =>
    request<{ ok: true }>(`/api/diagnoses/${encodeURIComponent(id)}/undo`, { method: "POST" }),
  /** The learner says the cause is wrong; the fix is not offered again for this revision. */
  dismissDiagnosis: (id: string) =>
    request<{ ok: true }>(`/api/diagnoses/${encodeURIComponent(id)}/dismiss`, { method: "POST" }),
  undoDismissal: (id: string) =>
    request<{ ok: true }>(`/api/diagnoses/${encodeURIComponent(id)}/dismiss/undo`, {
      method: "POST",
    }),
};
