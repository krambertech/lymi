import type { ExportOut, ExportStartInput } from "@lymi/core";
import { request } from "./request";

export type Export = ExportOut;

export const exportsApi = {
  export: (id: string) => request<Export>(`/api/exports/${id}`),
  startExport: (body: ExportStartInput) =>
    request<Export>("/api/exports", { method: "POST", body: JSON.stringify(body) }),
};
