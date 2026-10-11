import type { SeriesDecksInput, SeriesDeleteInput, SeriesInput, SeriesOut } from "@lymi/core";
import { request } from "./request";

/** A series as the API sends it: its active decks in order, and what they add up to. */
export type Series = SeriesOut;

export const seriesApi = {
  series: () => request<Series[]>("/api/series"),
  createSeries: (body: SeriesInput) =>
    request<Series>("/api/series", { method: "POST", body: JSON.stringify(body) }),
  renameSeries: (id: string, name: string) =>
    request<Series>(`/api/series/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  setSeriesDecks: (id: string, body: SeriesDecksInput) =>
    request<Series>(`/api/series/${id}/decks`, { method: "PUT", body: JSON.stringify(body) }),
  reorderSeries: (seriesIds: string[]) =>
    request<Series[]>("/api/series/order", {
      method: "PUT",
      body: JSON.stringify({ seriesIds }),
    }),
  deleteSeries: (id: string, { decks }: SeriesDeleteInput) =>
    request<{ ok: true }>(`/api/series/${id}?decks=${decks}`, { method: "DELETE" }),
};
